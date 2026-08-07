"""Pure-logic tests for the Mac serial bridge.

No serial port and no network -- runs with the standard library only:

    python3 -m unittest discover hardware/prototype/bridge
"""

import unittest

from pulse_parse import BootTracker, Pulse, parse_pulse_line


class ParsePulseLineTests(unittest.TestCase):
    def test_parses_valid_line(self):
        self.assertEqual(parse_pulse_line("PULSE,2,16381,1808"), Pulse(seq=2, uptime_ms=16381, delta_ms=1808))

    def test_first_pulse_zero_delta_becomes_none(self):
        self.assertEqual(parse_pulse_line("PULSE,1,14573,0"), Pulse(seq=1, uptime_ms=14573, delta_ms=None))

    def test_tolerates_whitespace_and_crlf(self):
        self.assertEqual(parse_pulse_line("  PULSE,3,18185,1804\r\n"), Pulse(seq=3, uptime_ms=18185, delta_ms=1804))

    def test_ignores_garbage_lines(self):
        for line in ["", "boot banner", "PULSE,1,2", "PULSE,a,b,c", "PULSE,1,2,3,4", "NOISE,1,2,3", None]:
            self.assertIsNone(parse_pulse_line(line))

    def test_rejects_negative_values(self):
        self.assertIsNone(parse_pulse_line("PULSE,-1,100,0"))
        self.assertIsNone(parse_pulse_line("PULSE,1,-100,0"))
        self.assertIsNone(parse_pulse_line("PULSE,1,100,-5"))


class BootTrackerTests(unittest.TestCase):
    def _counting_factory(self):
        state = {"n": 0}

        def factory():
            state["n"] += 1
            return f"boot-{state['n']}"

        return factory

    def test_keeps_boot_id_while_seq_and_uptime_increase(self):
        tracker = BootTracker(boot_id_factory=self._counting_factory())
        first = tracker.observe(Pulse(1, 1000, None))
        second = tracker.observe(Pulse(2, 2800, 1800))
        third = tracker.observe(Pulse(3, 4600, 1800))
        self.assertEqual(first, "boot-1")
        self.assertEqual(second, "boot-1")
        self.assertEqual(third, "boot-1")

    def test_rotates_boot_id_when_seq_resets(self):
        tracker = BootTracker(boot_id_factory=self._counting_factory())
        tracker.observe(Pulse(10, 50000, 1800))
        rotated = tracker.observe(Pulse(1, 1400, None))  # Uno rebooted: seq dropped
        self.assertEqual(rotated, "boot-2")

    def test_rotates_boot_id_when_uptime_resets(self):
        tracker = BootTracker(boot_id_factory=self._counting_factory())
        tracker.observe(Pulse(5, 90000, 1800))
        rotated = tracker.observe(Pulse(6, 1200, 1800))  # millis() restarted
        self.assertEqual(rotated, "boot-2")


if __name__ == "__main__":
    unittest.main()
