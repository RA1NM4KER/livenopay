#!/usr/bin/env python3
"""NewinMeter Mac serial bridge -- prototype.

Bridges the Arduino optical pulse reader to the NewinMeter ingestion API:

    Kamstrup LED -> LDR -> Arduino Uno -> USB serial -> [this bridge] -> HTTPS

The Mac acts as a temporary "dumb network bridge" so the real ingestion
architecture can be built and tested before the Wi-Fi ESP32 arrives. The bridge
preserves every individual pulse timestamp but batches the network traffic
(default ~5s) rather than sending one HTTP request per pulse.

Configuration (environment variables):

    SERIAL_PORT            e.g. /dev/cu.usbmodem14201   (required)
    NEWINMETER_URL         e.g. https://newinmeter.vercel.app/api/live/pulses  (required)
    NEWINMETER_DEVICE_KEY  nm_dev_...  (required, secret -- never commit)
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
import time
from typing import List

import requests
import serial

from pulse_parse import BootTracker, parse_pulse_line


def env(name: str, default: str | None = None, required: bool = False) -> str | None:
    value = os.environ.get(name, default)
    if required and not value:
        print(f"[bridge] Missing required env var: {name}", file=sys.stderr)
        sys.exit(1)
    return value


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
    # Buffers are parallel: buffer[i]'s pulse was received at received_ms[i].
    # A pulse can span more than one boot session in the same buffer, so each
    # pulse carries its own bootId decided at the moment it was observed.
    buffer: List[dict] = []

    session = requests.Session()
    headers = {"Authorization": f"Bearer {device_key}", "Content-Type": "application/json"}

    ser = serial.Serial(serial_port, baud, timeout=1)
    print(f"[bridge] serial open: {serial_port}")

    last_flush = time.monotonic()

    def flush() -> None:
        nonlocal buffer, last_flush
        last_flush = time.monotonic()
        if not buffer:
            return

        # Group consecutive pulses by bootId into one payload per boot, so a
        # reboot mid-buffer never mixes seq namespaces in a single request.
        pending = buffer
        try:
            index = 0
            while index < len(pending):
                boot_id = pending[index]["bootId"]
                group = []
                while index < len(pending) and pending[index]["bootId"] == boot_id:
                    group.append(pending[index]["pulse"])
                    index += 1

                response = session.post(
                    url,
                    json={"bootId": boot_id, "pulses": group},
                    headers=headers,
                    timeout=http_timeout,
                )
                if response.status_code >= 400:
                    # Keep everything buffered and retry on the next cycle --
                    # measurements are never dropped on a failed upload.
                    print(f"[bridge] upload failed HTTP {response.status_code}; keeping {len(pending)} buffered")
                    return

                body = response.json() if response.content else {}
                print(
                    f"[bridge] uploaded {len(group)} pulse(s) boot={boot_id[:8]} "
                    f"accepted={body.get('accepted', '?')} duplicates={body.get('duplicates', '?')}"
                )

            # Every group uploaded successfully -> clear the buffer.
            buffer = []
        except requests.RequestException as error:
            print(f"[bridge] network error: {error}; keeping {len(pending)} buffered")

    try:
        while True:
            line = ser.readline().decode("utf-8", errors="replace")
            if line:
                pulse = parse_pulse_line(line)
                if pulse is not None:
                    boot_id = tracker.observe(pulse)
                    received_ms = int(time.time() * 1000)  # UTC epoch ms, assigned on arrival
                    buffer.append(
                        {
                            "bootId": boot_id,
                            "pulse": {
                                "seq": pulse.seq,
                                "timestampMs": received_ms,
                                "uptimeMs": pulse.uptime_ms,
                                "deltaMs": pulse.delta_ms,
                            },
                        }
                    )

            if time.monotonic() - last_flush >= batch_seconds:
                flush()
    except KeyboardInterrupt:
        print("\n[bridge] stopping; flushing remaining buffer")
        flush()
    finally:
        ser.close()


if __name__ == "__main__":
    main()
