"""Pure, dependency-free bridge logic.

Kept separate from serial/HTTP I/O so it can be unit tested without any
hardware or network (see test_pulse_parse.py). Everything here is
deterministic given its inputs (the boot-id factory is injectable).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Callable, Optional


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
