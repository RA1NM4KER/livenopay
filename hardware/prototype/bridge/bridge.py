#!/usr/bin/env python3
"""NewinMeter Mac serial bridge -- prototype.

Bridges the Arduino optical pulse reader to the NewinMeter ingestion API:

    Kamstrup LED -> LDR -> Arduino Uno -> USB serial -> [this bridge] -> HTTPS

The Mac is a temporary "dumb network bridge" so the real ingestion
architecture can be built and tested before the Wi-Fi ESP32 arrives.

Architecture (producer/consumer, see pulse_parse.py for the pure logic):

  * Serial reader thread -- exclusively owns the serial port, parses PULSE
    lines immediately, and appends them to a thread-safe buffer. It NEVER does
    HTTP, so a slow upload, retry, DNS failure or timeout can never stall
    serial acquisition (the bug this design fixes).
  * Uploader (main thread) -- every ~5s batches queued pulses and POSTs them,
    retrying failed batches on the next cycle without ever blocking the reader.
    Acknowledged pulses are removed exactly once; a full batch is capped at 100
    to match the ingestion endpoint.

Timing: the Arduino's monotonic uptime_ms is the authority on relative pulse
spacing; the Mac only supplies the absolute UTC anchor. Timestamps are
reconstructed as boot_epoch + uptime (see BootEpochEstimator), so pulses
drained from the OS serial buffer in a burst still keep their true spacing.

Configuration (environment variables):

    SERIAL_PORT            e.g. /dev/cu.usbmodem14201   (required)
    NEWINMETER_URL         e.g. https://newinmeter.vercel.app/api/live/pulses  (required)
    NEWINMETER_DEVICE_KEY  nm_dev_...  (required, secret -- never commit/log)
    DEVICE_ID              optional, local display only; NOT trusted by the API
    BAUD                   optional, default 115200
    BATCH_SECONDS          optional, default 5
    HTTP_TIMEOUT_SECONDS   optional, default 10

Dependencies (kept out of the Node package -- see requirements.txt):
    pip install pyserial requests
"""

from __future__ import annotations

import os
import sys
import threading
import time

import requests
import serial

from pulse_parse import (
    BootEpochEstimator,
    BootTracker,
    PostFn,
    PulseBuffer,
    drain_cycle,
    ingest_line,
)


def env(name: str, default: str | None = None, required: bool = False) -> str | None:
    value = os.environ.get(name, default)
    if required and not value:
        print(f"[bridge] Missing required env var: {name}", file=sys.stderr)
        sys.exit(1)
    return value


def make_post_fn(session: requests.Session, url: str, headers: dict, timeout: float) -> PostFn:
    """Wrap requests into a never-raising sender for drain_cycle.

    Returns True only on a 2xx/3xx acknowledged upload. Any failure (>=400 or a
    network exception) returns False so the batch stays queued. The device key
    lives in `headers` and is never printed.
    """

    def post_fn(boot_id: str, pulses: list) -> bool:
        try:
            response = session.post(
                url,
                json={"bootId": boot_id, "pulses": pulses},
                headers=headers,
                timeout=timeout,
            )
        except requests.RequestException as error:
            print(f"[bridge] network error: {error}; keeping {len(pulses)} buffered")
            return False

        if response.status_code >= 400:
            print(f"[bridge] upload failed HTTP {response.status_code}; keeping {len(pulses)} buffered")
            return False

        body = response.json() if response.content else {}
        print(
            f"[bridge] uploaded {len(pulses)} pulse(s) boot={boot_id[:8]} "
            f"accepted={body.get('accepted', '?')} duplicates={body.get('duplicates', '?')}"
        )
        return True

    return post_fn


def run_serial_reader(
    ser: "serial.Serial",
    tracker: BootTracker,
    estimator: BootEpochEstimator,
    buffer: PulseBuffer,
    stop_event: threading.Event,
) -> None:
    """Producer loop: own the serial port, parse, buffer. No HTTP, ever.

    pyserial's read timeout makes readline() return periodically even when the
    Arduino is silent, so stop_event is checked regularly. Serial errors are
    logged and retried rather than killing the thread.
    """
    while not stop_event.is_set():
        try:
            raw = ser.readline()
        except serial.SerialException as error:
            print(f"[bridge] serial error: {error}; retrying")
            time.sleep(0.5)
            continue

        if not raw:
            continue

        line = raw.decode("utf-8", errors="replace")
        # Wall-clock is read at the moment the line arrives; the estimator turns
        # it into a spacing-preserving timestamp using the Arduino uptime.
        ingest_line(line, tracker, estimator, buffer, int(time.time() * 1000))


def main() -> None:
    serial_port = env("SERIAL_PORT", required=True)
    url = env("NEWINMETER_URL", required=True)
    device_key = env("NEWINMETER_DEVICE_KEY", required=True)
    device_id = env("DEVICE_ID")  # display only; the API derives identity from the key
    baud = int(env("BAUD", "115200"))
    batch_seconds = float(env("BATCH_SECONDS", "5"))
    http_timeout = float(env("HTTP_TIMEOUT_SECONDS", "10"))

    # Never print the key itself.
    print(f"[bridge] device={device_id or '(unset)'} port={serial_port} url={url}")
    print(f"[bridge] batching every {batch_seconds}s at {baud} baud")

    tracker = BootTracker()
    estimator = BootEpochEstimator()
    buffer = PulseBuffer()

    session = requests.Session()
    headers = {"Authorization": f"Bearer {device_key}", "Content-Type": "application/json"}
    post_fn = make_post_fn(session, url, headers, http_timeout)

    ser = serial.Serial(serial_port, baud, timeout=1)
    print(f"[bridge] serial open: {serial_port}")

    stop_event = threading.Event()
    reader = threading.Thread(
        target=run_serial_reader,
        args=(ser, tracker, estimator, buffer, stop_event),
        name="serial-reader",
        daemon=True,
    )
    reader.start()

    try:
        while True:
            # Interruptible wait: KeyboardInterrupt breaks out of sleep so a
            # Ctrl+C mid-cycle still reaches the flush below.
            time.sleep(batch_seconds)
            result = drain_cycle(buffer, estimator, post_fn)
            # One concise line per non-empty cycle, so batching is verifiable at
            # a glance: how many were eligible when the cycle began, how many
            # uploaded, how many HTTP requests that took (>1 only to clear a
            # pre-existing backlog), and how many remain queued (arrivals during
            # the cycle, held for the next one).
            if result.eligible > 0:
                print(
                    f"[bridge] cycle: eligible={result.eligible} uploaded={result.uploaded} "
                    f"requests={result.requests} remaining={len(buffer)}"
                )
    except KeyboardInterrupt:
        print(f"\n[bridge] stopping; {len(buffer)} pulse(s) queued, attempting final flush")
        stop_event.set()
        reader.join(timeout=2)
        # Best-effort final flush. The reader is stopped, so the cycle budget
        # equals everything left -- one drain_cycle clears the whole remaining
        # backlog (in <=100 chunks). RAM-only buffer: anything still unsent
        # after this (e.g. network still down) is lost on exit.
        drain_cycle(buffer, estimator, post_fn)
        remaining = len(buffer)
        if remaining:
            print(f"[bridge] warning: {remaining} pulse(s) could not be uploaded and are lost")
    finally:
        ser.close()


if __name__ == "__main__":
    main()
