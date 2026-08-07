"""Pure, dependency-free bridge logic.

Kept separate from serial/HTTP I/O (see bridge.py) so every timing, buffering
and retry decision can be unit tested deterministically -- no hardware, no
network, no sleeping (see test_pulse_parse.py). Only the standard library is
imported here; pyserial/requests live in bridge.py.

Threading model (see bridge.py): a single *producer* thread owns the serial
port and calls ingest_line(); a single *consumer* thread batches and uploads
via drain_once(). The two shared objects -- PulseBuffer and BootEpochEstimator
-- are internally locked. BootTracker is touched only by the producer.
"""

from __future__ import annotations

import threading
import uuid
from collections import deque
from dataclasses import dataclass
from typing import Callable, Deque, Dict, List, Optional, Tuple

# The ingestion endpoint accepts at most 100 pulses per request, so a long
# offline backlog is uploaded in capped chunks rather than one oversized body
# that the API would reject with 400.
MAX_BATCH_SIZE = 100


@dataclass(frozen=True)
class Pulse:
    seq: int
    uptime_ms: int
    delta_ms: Optional[int]


def parse_pulse_line(line: str) -> Optional[Pulse]:
    """Parse one serial line.

    Accepts only well-formed ``PULSE,<seq>,<uptime_ms>,<delta_ms>`` lines and
    returns None for anything else (boot banners, partial lines, noise), so
    garbage never reaches the upload buffer. delta_ms of 0 (the first pulse
    after boot) is normalised to None -- there is no real interval yet.
    """
    if line is None:
        return None

    stripped = line.strip()
    if not stripped.startswith("PULSE,"):
        return None

    parts = stripped.split(",")
    if len(parts) != 4:
        return None

    try:
        seq = int(parts[1])
        uptime_ms = int(parts[2])
        delta_ms: Optional[int] = int(parts[3])
    except ValueError:
        return None

    if seq < 0 or uptime_ms < 0 or delta_ms is None or delta_ms < 0:
        return None

    if delta_ms == 0:
        delta_ms = None

    return Pulse(seq=seq, uptime_ms=uptime_ms, delta_ms=delta_ms)


class BootTracker:
    """Tracks the measuring hardware's boot session and rotates the bootId.

    The Arduino's seq and millis() both reset when the Uno reboots. If the
    Python process stays alive across an Uno reboot while reusing the same
    bootId, the restarted seq numbers would collide with already-stored rows
    and be rejected as duplicates. So a reset is detected -- seq or uptime
    clearly decreasing -- and a fresh bootId is generated before the reset
    pulse is accepted. (The ESP32 will later mint its own boot UUID directly,
    making this unnecessary on that hardware.)

    Producer-thread only; not internally locked.
    """

    def __init__(self, boot_id_factory: Callable[[], str] = lambda: str(uuid.uuid4())):
        self._boot_id_factory = boot_id_factory
        self._boot_id = boot_id_factory()
        self._prev_seq: Optional[int] = None
        self._prev_uptime: Optional[int] = None

    @property
    def boot_id(self) -> str:
        return self._boot_id

    def observe(self, pulse: Pulse) -> str:
        """Register a pulse and return the bootId it belongs to.

        Rotates the bootId first if this pulse indicates the Uno restarted.
        """
        is_reset = (
            self._prev_seq is not None
            and (pulse.seq < self._prev_seq or pulse.uptime_ms < self._prev_uptime)
        )

        if is_reset:
            self._boot_id = self._boot_id_factory()

        self._prev_seq = pulse.seq
        self._prev_uptime = pulse.uptime_ms
        return self._boot_id


class BootEpochEstimator:
    """Reconstructs wall-clock pulse times from the Arduino's monotonic uptime.

    The Arduino's ``millis()`` is the authority on *relative* pulse spacing; the
    Mac only supplies the *absolute* UTC anchor. For a given boot session we
    estimate::

        boot_epoch_ms = min over observed pulses of (host_receive_ms - uptime_ms)
        pulse_timestamp_ms = boot_epoch_ms + uptime_ms

    Why the minimum: serial/OS queue delay can only make a pulse's host receive
    time *later* than the pulse physically happened, so (host_receive - uptime)
    is always >= the true boot epoch. Keeping the smallest value tracks the
    least-delayed observation and never lets a later, queue-delayed pulse push
    the anchor forward and distort spacing. Once a boot has any low-delay
    history, a burst of pulses drained from the OS buffer at nearly the same
    host time still reconstructs to their true spacing, because each keeps its
    own uptime_ms.

    Timestamps are computed at *upload* time (drain_once), not at read time, so
    they use the best boot-epoch estimate available so far. Because the DB
    idempotency key is (device_id, boot_id, seq) and observed_at is not part of
    it, a retry recomputing a marginally different timestamp is harmless -- the
    duplicate row is ignored and the first stored observed_at is kept.

    Shared between producer (observe) and consumer (timestamp_ms), so it is
    internally locked.
    """

    def __init__(self) -> None:
        self._epoch_ms: Dict[str, int] = {}
        self._lock = threading.Lock()

    def observe(self, boot_id: str, uptime_ms: int, host_receive_ms: int) -> None:
        candidate = host_receive_ms - uptime_ms
        with self._lock:
            current = self._epoch_ms.get(boot_id)
            if current is None or candidate < current:
                self._epoch_ms[boot_id] = candidate

    def timestamp_ms(self, boot_id: str, uptime_ms: int) -> int:
        with self._lock:
            epoch = self._epoch_ms[boot_id]
        return epoch + uptime_ms

    def boot_epoch_ms(self, boot_id: str) -> Optional[int]:
        with self._lock:
            return self._epoch_ms.get(boot_id)


# A buffered pulse, stored raw (no timestamp yet -- that is reconstructed at
# upload time from the boot epoch). bootId is decided per pulse so a buffer that
# straddles an Uno reboot never mixes seq namespaces in one request.
BufferedPulse = Dict[str, object]


class PulseBuffer:
    """Thread-safe FIFO of buffered pulses with claim / ack semantics.

    Producer appends; consumer claims a leading batch (same boot, capped size),
    uploads it, then acks (removes exactly that many from the front) only on
    success. Pulses that arrive *during* an upload are appended at the back and
    are therefore never removed by the ack of an earlier batch -- ack pops the
    front N, and only the single consumer ever pops. A failed upload acks
    nothing, so the batch stays queued for the next cycle.
    """

    def __init__(self) -> None:
        self._items: Deque[BufferedPulse] = deque()
        self._lock = threading.Lock()

    def append(self, item: BufferedPulse) -> None:
        with self._lock:
            self._items.append(item)

    def __len__(self) -> int:
        with self._lock:
            return len(self._items)

    def snapshot(self) -> List[BufferedPulse]:
        with self._lock:
            return list(self._items)

    def claim_batch(self, max_size: int = MAX_BATCH_SIZE) -> Tuple[List[BufferedPulse], Optional[str]]:
        """Return the leading run of same-boot pulses (up to max_size).

        Does not remove anything -- the caller acks after a successful upload.
        """
        with self._lock:
            if not self._items:
                return [], None

            boot_id = self._items[0]["bootId"]
            batch: List[BufferedPulse] = []
            for item in self._items:
                if item["bootId"] != boot_id or len(batch) >= max_size:
                    break
                batch.append(item)
            return batch, boot_id  # type: ignore[return-value]

    def ack(self, count: int) -> None:
        """Remove exactly `count` pulses from the front (an uploaded batch)."""
        with self._lock:
            for _ in range(min(count, len(self._items))):
                self._items.popleft()


def ingest_line(
    line: str,
    tracker: BootTracker,
    estimator: BootEpochEstimator,
    buffer: PulseBuffer,
    host_receive_ms: int,
) -> Optional[BufferedPulse]:
    """Producer step: parse a serial line and buffer it (no HTTP).

    Ignores malformed lines. Resolves the bootId (rotating on an Uno reset)
    *before* updating the epoch estimate, so a reboot starts a fresh timestamp
    anchor. Returns the buffered item, or None for garbage.
    """
    pulse = parse_pulse_line(line)
    if pulse is None:
        return None

    boot_id = tracker.observe(pulse)
    estimator.observe(boot_id, pulse.uptime_ms, host_receive_ms)

    item: BufferedPulse = {
        "bootId": boot_id,
        "seq": pulse.seq,
        "uptimeMs": pulse.uptime_ms,
        "deltaMs": pulse.delta_ms,
    }
    buffer.append(item)
    return item


# A network sender: (boot_id, pulses) -> True on an acknowledged upload, False
# on any failure. Must never raise -- a failure just leaves the batch queued.
PostFn = Callable[[str, List[dict]], bool]


def build_payload_pulses(estimator: BootEpochEstimator, batch: List[BufferedPulse], boot_id: str) -> List[dict]:
    """Reconstruct each pulse's wall-clock timestampMs from its boot epoch."""
    return [
        {
            "seq": item["seq"],
            "timestampMs": estimator.timestamp_ms(boot_id, int(item["uptimeMs"])),  # type: ignore[arg-type]
            "uptimeMs": item["uptimeMs"],
            "deltaMs": item["deltaMs"],
        }
        for item in batch
    ]


def drain_once(
    buffer: PulseBuffer,
    estimator: BootEpochEstimator,
    post_fn: PostFn,
    max_batch: int = MAX_BATCH_SIZE,
) -> int:
    """Consumer step: upload leading batches until one fails or the buffer empties.

    Returns the number of pulses successfully acknowledged this call. Stops at
    the first failed batch, leaving it (and everything after) queued.
    """
    uploaded = 0
    while True:
        batch, boot_id = buffer.claim_batch(max_batch)
        if not batch or boot_id is None:
            return uploaded

        pulses = build_payload_pulses(estimator, batch, boot_id)
        if not post_fn(boot_id, pulses):
            return uploaded

        buffer.ack(len(batch))
        uploaded += len(batch)
