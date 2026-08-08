"""Pure-logic tests for the Mac serial bridge.

No serial port and no network, standard library only (deterministic, no real
sleeping in the logic under test):

    python3 -m unittest discover hardware/prototype/bridge
"""

import threading
import time
import unittest

from pulse_parse import (
    BootEpochEstimator,
    BootTracker,
    PulseBuffer,
    Pulse,
    drain_cycle,
    ingest_line,
    parse_pulse_line,
)


def counting_factory():
    state = {"n": 0}

    def factory():
        state["n"] += 1
        return f"boot-{state['n']}"

    return factory


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
    def test_keeps_boot_id_while_seq_and_uptime_increase(self):
        tracker = BootTracker(boot_id_factory=counting_factory())
        first = tracker.observe(Pulse(1, 1000, None))
        second = tracker.observe(Pulse(2, 2800, 1800))
        third = tracker.observe(Pulse(3, 4600, 1800))
        self.assertEqual(first, "boot-1")
        self.assertEqual(second, "boot-1")
        self.assertEqual(third, "boot-1")

    def test_rotates_boot_id_when_seq_resets(self):
        tracker = BootTracker(boot_id_factory=counting_factory())
        tracker.observe(Pulse(10, 50000, 1800))
        rotated = tracker.observe(Pulse(1, 1400, None))  # Uno rebooted: seq dropped
        self.assertEqual(rotated, "boot-2")

    def test_rotates_boot_id_when_uptime_resets(self):
        tracker = BootTracker(boot_id_factory=counting_factory())
        tracker.observe(Pulse(5, 90000, 1800))
        rotated = tracker.observe(Pulse(6, 1200, 1800))  # millis() restarted
        self.assertEqual(rotated, "boot-2")


class BootEpochEstimatorTests(unittest.TestCase):
    def test_normal_timing_preserves_one_second_spacing(self):
        # Host receives them ~1s apart with a small constant transport delay.
        est = BootEpochEstimator()
        boot = "b"
        delay = 40
        for uptime, host in [(1000, 5000 + delay), (2000, 6000 + delay), (3000, 7000 + delay)]:
            est.observe(boot, uptime, host)
        ts = [est.timestamp_ms(boot, u) for u in (1000, 2000, 3000)]
        self.assertEqual(ts[1] - ts[0], 1000)
        self.assertEqual(ts[2] - ts[1], 1000)

    def test_bunched_reads_still_reconstruct_distinct_spacing(self):
        # THE regression: three physical pulses 1s apart, but all drained from
        # the OS serial buffer at nearly the same host time after a block.
        est = BootEpochEstimator()
        boot = "b"
        host = 1_000_000  # same wall-clock for all three
        for uptime in (10000, 11000, 12000):
            est.observe(boot, uptime, host)
        ts = [est.timestamp_ms(boot, u) for u in (10000, 11000, 12000)]
        self.assertNotEqual(ts[0], ts[1])  # must NOT collapse to one timestamp
        self.assertEqual(ts[1] - ts[0], 1000)
        self.assertEqual(ts[2] - ts[1], 1000)

    def test_early_low_delay_history_gives_true_absolute_times(self):
        # With real-time early pulses anchoring the boot epoch, a later burst
        # reconstructs to the correct ABSOLUTE times, not just spacing.
        est = BootEpochEstimator()
        boot = "b"
        boot_epoch = 1_700_000_000_000
        # Early pulses arrive in real time (zero delay) -> exact anchor.
        est.observe(boot, 1000, boot_epoch + 1000)
        est.observe(boot, 2000, boot_epoch + 2000)
        # Later burst arrives delayed and bunched at one host time.
        burst_host = boot_epoch + 200000
        for uptime in (193388, 194534):
            est.observe(boot, uptime, burst_host)
        self.assertEqual(est.timestamp_ms(boot, 193388), boot_epoch + 193388)
        self.assertEqual(est.timestamp_ms(boot, 194534), boot_epoch + 194534)

    def test_delayed_pulse_never_pushes_epoch_forward(self):
        est = BootEpochEstimator()
        boot = "b"
        est.observe(boot, 1000, 10000)  # candidate 9000
        anchor = est.boot_epoch_ms(boot)
        est.observe(boot, 1000, 99999)  # heavily delayed: candidate 98999 (larger)
        self.assertEqual(est.boot_epoch_ms(boot), anchor)  # unchanged

    def test_reboot_starts_a_fresh_anchor(self):
        est = BootEpochEstimator()
        est.observe("boot-1", 500000, 2_000_000)
        est.observe("boot-2", 1000, 3_000_000)  # new boot: uptime near zero again
        self.assertEqual(est.boot_epoch_ms("boot-1"), 2_000_000 - 500000)
        self.assertEqual(est.boot_epoch_ms("boot-2"), 3_000_000 - 1000)
        # New boot's timestamps are anchored independently of the old boot.
        self.assertEqual(est.timestamp_ms("boot-2", 1000), 3_000_000)


class IngestLineTests(unittest.TestCase):
    def test_bunched_serial_reads_do_not_share_one_timestamp(self):
        tracker = BootTracker(boot_id_factory=counting_factory())
        est = BootEpochEstimator()
        buf = PulseBuffer()
        host = 1_000_000  # all three read at the same host ms (queued burst)
        for line in ("PULSE,10,10000,1000", "PULSE,11,11000,1000", "PULSE,12,12000,1000"):
            ingest_line(line, tracker, est, buf, host)

        batch, boot_id = buf.claim_batch()
        ts = [est.timestamp_ms(boot_id, int(item["uptimeMs"])) for item in batch]
        self.assertEqual(len(set(ts)), 3)
        self.assertEqual(ts[1] - ts[0], 1000)
        self.assertEqual(ts[2] - ts[1], 1000)

    def test_ignores_malformed_lines(self):
        tracker = BootTracker(boot_id_factory=counting_factory())
        est = BootEpochEstimator()
        buf = PulseBuffer()
        self.assertIsNone(ingest_line("garbage", tracker, est, buf, 1000))
        self.assertEqual(len(buf), 0)


def collecting_post_fn(recorder):
    def post_fn(boot_id, pulses):
        recorder.append((boot_id, [p["seq"] for p in pulses]))
        return True

    return post_fn


def item(boot_id, seq, uptime=None):
    return {"bootId": boot_id, "seq": seq, "uptimeMs": uptime if uptime is not None else seq * 1000, "deltaMs": None}


def estimator_for(items):
    est = BootEpochEstimator()
    for it in items:
        est.observe(it["bootId"], int(it["uptimeMs"]), 0)
    return est


class PulseBufferTests(unittest.TestCase):
    def test_batch_is_capped_at_max_size(self):
        buf = PulseBuffer()
        for s in range(250):
            buf.append(item("b", s))
        batch, _ = buf.claim_batch(max_size=100)
        self.assertEqual(len(batch), 100)

    def test_batches_never_mix_boot_ids(self):
        buf = PulseBuffer()
        for s in range(3):
            buf.append(item("boot-1", s))
        for s in range(1, 3):
            buf.append(item("boot-2", s))
        first, boot_a = buf.claim_batch()
        self.assertEqual(boot_a, "boot-1")
        self.assertEqual([it["seq"] for it in first], [0, 1, 2])
        buf.ack(len(first))
        second, boot_b = buf.claim_batch()
        self.assertEqual(boot_b, "boot-2")
        self.assertEqual([it["seq"] for it in second], [1, 2])

    def test_concurrent_arrivals_are_never_removed_by_ack(self):
        # Requirement 8: claim, then more pulses arrive, then ack only the
        # claimed count -> the arrivals survive at the back.
        buf = PulseBuffer()
        for s in range(5):
            buf.append(item("b", s))
        claimed, _ = buf.claim_batch()
        for s in range(5, 8):  # arrive during "upload"
            buf.append(item("b", s))
        buf.ack(len(claimed))  # ack only the claimed 5
        self.assertEqual([it["seq"] for it in buf.snapshot()], [5, 6, 7])


class DrainCycleTests(unittest.TestCase):
    def test_exactly_the_cycle_start_pulses_are_uploaded(self):
        # Requirement 1.
        buf = PulseBuffer()
        for s in range(5):
            buf.append(item("b", s))
        est = estimator_for(buf.snapshot())
        recorder = []

        result = drain_cycle(buf, est, collecting_post_fn(recorder))

        self.assertEqual(result.eligible, 5)
        self.assertEqual(result.uploaded, 5)
        self.assertEqual(result.requests, 1)
        self.assertEqual(recorder, [("b", [0, 1, 2, 3, 4])])
        self.assertEqual(len(buf), 0)

    def test_pulses_arriving_during_a_post_wait_for_the_next_cycle(self):
        # Requirements 2 + 3: a pulse (indeed several) arriving while the POST
        # callback runs must NOT be swept into this cycle, and must not trigger
        # a chain of immediate 1-pulse POSTs.
        buf = PulseBuffer()
        for s in range(5):
            buf.append(item("b", s))
        est = estimator_for([item("b", s) for s in range(20)])
        recorder = []

        def post_fn(boot_id, pulses):
            recorder.append(len(pulses))
            # Two new pulses land during EVERY request callback.
            base = 100 + len(recorder) * 2
            buf.append(item("b", base))
            buf.append(item("b", base + 1))
            return True

        result = drain_cycle(buf, est, post_fn)

        # Exactly one request of the 5 eligible pulses -- NOT 5 then 1 then 1...
        self.assertEqual(result.eligible, 5)
        self.assertEqual(result.uploaded, 5)
        self.assertEqual(result.requests, 1)
        self.assertEqual(recorder, [5])
        # The 2 arrivals during the callback are held for the next cycle.
        self.assertEqual(len(buf), 2)

        # Next cycle picks up exactly those held pulses.
        recorder.clear()
        result2 = drain_cycle(buf, est, post_fn)
        self.assertEqual(result2.eligible, 2)
        self.assertEqual(result2.uploaded, 2)

    def test_backlog_drains_in_100_capped_requests_within_one_cycle(self):
        # Requirement 4: 250 same-boot pulses -> 100 + 100 + 50 in one cycle.
        buf = PulseBuffer()
        for s in range(250):
            buf.append(item("b", s))
        est = estimator_for(buf.snapshot())
        recorder = []

        result = drain_cycle(buf, est, collecting_post_fn(recorder))

        self.assertEqual(result.eligible, 250)
        self.assertEqual(result.uploaded, 250)
        self.assertEqual(result.requests, 3)
        self.assertEqual([len(seqs) for _, seqs in recorder], [100, 100, 50])
        self.assertEqual(len(buf), 0)

    def test_arrivals_during_backlog_drain_wait_for_next_cycle(self):
        # Requirement 5: pulses arriving while the 250 backlog drains stay for
        # the next cycle; only the original 250 upload this cycle.
        buf = PulseBuffer()
        for s in range(250):
            buf.append(item("b", s))
        est = estimator_for([item("b", s) for s in range(300)])

        def post_fn(boot_id, pulses):
            buf.append(item("b", 250 + len(pulses)))  # one arrival per request
            return True

        result = drain_cycle(buf, est, post_fn)

        self.assertEqual(result.eligible, 250)
        self.assertEqual(result.uploaded, 250)
        self.assertEqual(result.requests, 3)  # 100 + 100 + 50
        self.assertEqual(len(buf), 3)  # three arrivals held for next cycle

    def test_failed_upload_acknowledges_nothing_from_the_failed_batch(self):
        # Requirement 6.
        buf = PulseBuffer()
        for s in range(5):
            buf.append(item("b", s))
        est = estimator_for(buf.snapshot())

        result = drain_cycle(buf, est, lambda boot_id, pulses: False)
        self.assertEqual(result.uploaded, 0)
        self.assertEqual(len(buf), 5)  # nothing acked

        # And a mid-backlog failure acks only the batches that succeeded.
        buf2 = PulseBuffer()
        for s in range(250):
            buf2.append(item("b", s))
        est2 = estimator_for(buf2.snapshot())
        calls = {"n": 0}

        def flaky(boot_id, pulses):
            calls["n"] += 1
            return calls["n"] == 1  # first request ok, second fails

        result2 = drain_cycle(buf2, est2, flaky)
        self.assertEqual(result2.uploaded, 100)  # only the first batch
        self.assertEqual(len(buf2), 150)  # failed batch + rest stay queued

    def test_same_boot_boundaries_respected_within_a_cycle(self):
        # Requirement 7: a budget spanning two boots splits at the boundary.
        buf = PulseBuffer()
        for s in range(3):
            buf.append(item("boot-1", s))
        for s in range(2):
            buf.append(item("boot-2", s))
        est = estimator_for(buf.snapshot())
        recorder = []

        result = drain_cycle(buf, est, collecting_post_fn(recorder))

        self.assertEqual(result.eligible, 5)
        self.assertEqual(result.uploaded, 5)
        self.assertEqual(result.requests, 2)
        self.assertEqual(recorder, [("boot-1", [0, 1, 2]), ("boot-2", [0, 1])])

    def test_reboot_mid_stream_uploads_two_boots_separately(self):
        tracker = BootTracker(boot_id_factory=counting_factory())
        est = BootEpochEstimator()
        buf = PulseBuffer()
        for line, host in [
            ("PULSE,1,1000,0", 10000),
            ("PULSE,2,2000,1000", 11000),
            ("PULSE,1,900,0", 12000),  # Uno reboot: uptime dropped -> new boot
        ]:
            ingest_line(line, tracker, est, buf, host)

        recorder = []
        drain_cycle(buf, est, collecting_post_fn(recorder))
        self.assertEqual(recorder, [("boot-1", [1, 2]), ("boot-2", [1])])


class SerialNotBlockedByUploadTests(unittest.TestCase):
    def test_serial_reader_keeps_buffering_during_a_blocked_upload(self):
        # Requirement 1, with real threads: a genuinely stuck upload must not
        # stop serial acquisition. A fake serial feeds pulses; the uploader is
        # held inside post_fn on an Event. We assert the reader drains the whole
        # serial feed while the "network" is stuck, then release and confirm
        # every pulse is accounted for (uploaded + still queued == everything).
        tracker = BootTracker(boot_id_factory=counting_factory())
        est = BootEpochEstimator()
        buf = PulseBuffer()

        total = 20
        all_fed = threading.Event()

        class FakeSerial:
            def __init__(self):
                self.i = 0

            def readline(self):
                if self.i < total:
                    self.i += 1
                    return f"PULSE,{self.i},{self.i * 1000},1000\n".encode()
                all_fed.set()
                return b""  # idle read, like pyserial's 1s timeout

        ser = FakeSerial()
        stop = threading.Event()

        def reader():  # mirrors run_serial_reader without pyserial
            while not stop.is_set():
                raw = ser.readline()
                if not raw:
                    if all_fed.is_set():
                        return
                    continue
                ingest_line(raw.decode(), tracker, est, buf, 1_000_000)

        release = threading.Event()
        upload_started = threading.Event()
        uploaded_holder = {"n": 0}

        def blocking_post(boot_id, pulses):
            upload_started.set()
            release.wait(timeout=5)  # first call blocks like a stuck request
            return True

        t_reader = threading.Thread(target=reader, name="reader", daemon=True)
        t_reader.start()

        # Wait (bounded) until at least one pulse is buffered so the uploader
        # has something to claim before it blocks.
        for _ in range(5000):
            if len(buf) > 0:
                break
            time.sleep(0.001)
        self.assertGreater(len(buf), 0)

        def run_drain():
            uploaded_holder["n"] = drain_cycle(buf, est, blocking_post).uploaded

        t_upload = threading.Thread(target=run_drain, daemon=True)
        t_upload.start()
        self.assertTrue(upload_started.wait(timeout=5))

        # The reader must finish the serial feed even though the upload is stuck.
        self.assertTrue(all_fed.wait(timeout=5))
        self.assertEqual(ser.i, total)  # every line read despite the stuck upload

        release.set()
        t_upload.join(timeout=5)
        stop.set()
        t_reader.join(timeout=5)

        # Nothing lost: uploaded count + whatever remains queued == everything.
        self.assertEqual(uploaded_holder["n"] + len(buf), total)


if __name__ == "__main__":
    unittest.main()
