import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultRange, inferQuickRange, quickRangeFromDates, quickRangeFromLatest } from "@/lib/filters";

// "Today" is faked to a fixed Saturday so week/month boundaries are
// deterministic instead of depending on whenever the suite happens to run.
const FAKE_NOW = new Date(2026, 6, 25, 12, 0, 0); // 2026-07-25 (Saturday), local time

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("defaultRange", () => {
  it("returns an empty allTime range when there's no data yet", () => {
    expect(defaultRange({})).toEqual({ from: "", to: "", quickRange: "allTime" });
  });

  it("defaults to the past 3 months ending today when bounds are wide", () => {
    const result = defaultRange({ from: "2020-01-01", to: "2026-07-20" });
    expect(result).toEqual({ from: "2026-04-25", to: "2026-07-25", quickRange: "past3Months" });
  });

  it("clamps the start to the earliest available data when the account is newer than 3 months", () => {
    const result = defaultRange({ from: "2026-07-10", to: "2026-07-20" });
    expect(result).toEqual({ from: "2026-07-10", to: "2026-07-25", quickRange: "past3Months" });
  });
});

describe("quickRangeFromLatest", () => {
  it("returns an empty range for allTime and custom", () => {
    expect(quickRangeFromLatest("allTime")).toEqual({ from: "", to: "", quickRange: "allTime" });
    expect(quickRangeFromLatest("custom")).toEqual({ from: "", to: "", quickRange: "custom" });
  });

  it("computes pastWeek as a 7-day inclusive window ending today", () => {
    expect(quickRangeFromLatest("pastWeek")).toEqual({
      from: "2026-07-19",
      to: "2026-07-25",
      quickRange: "pastWeek"
    });
  });

  it("computes pastMonth by subtracting a calendar month", () => {
    expect(quickRangeFromLatest("pastMonth")).toEqual({
      from: "2026-06-25",
      to: "2026-07-25",
      quickRange: "pastMonth"
    });
  });

  it("computes past3Months by subtracting 3 calendar months", () => {
    expect(quickRangeFromLatest("past3Months")).toEqual({
      from: "2026-04-25",
      to: "2026-07-25",
      quickRange: "past3Months"
    });
  });

  it("computes thisMonth as the 1st of the current month through today", () => {
    expect(quickRangeFromLatest("thisMonth")).toEqual({
      from: "2026-07-01",
      to: "2026-07-25",
      quickRange: "thisMonth"
    });
  });

  it("computes thisWeek as Monday through today (ISO week, not Sunday-start)", () => {
    // 2026-07-25 is a Saturday -> Monday of that week is 2026-07-20.
    expect(quickRangeFromLatest("thisWeek")).toEqual({
      from: "2026-07-20",
      to: "2026-07-25",
      quickRange: "thisWeek"
    });
  });

  it("clamps the day-of-month when subtracting months lands past the shorter month's end", () => {
    vi.setSystemTime(new Date(2026, 2, 31, 12, 0, 0)); // 2026-03-31
    // One month back from March 31 doesn't exist in February (28 days in
    // 2026) -- should clamp to Feb 28, not silently roll into March.
    expect(quickRangeFromLatest("pastMonth")).toEqual({
      from: "2026-02-28",
      to: "2026-03-31",
      quickRange: "pastMonth"
    });
  });
});

describe("quickRangeFromDates", () => {
  it("recognizes allTime for an empty range", () => {
    expect(quickRangeFromDates("", "")).toBe("allTime");
  });

  it("recognizes a range that matches a known preset", () => {
    expect(quickRangeFromDates("2026-07-19", "2026-07-25")).toBe("pastWeek");
  });

  it("falls back to custom for a range matching no preset", () => {
    expect(quickRangeFromDates("2026-01-01", "2026-01-15")).toBe("custom");
  });
});

describe("inferQuickRange", () => {
  it("recognizes allTime when the range exactly matches the account's full bounds", () => {
    const bounds = { from: "2020-01-01", to: "2026-07-25" };
    expect(inferQuickRange("2020-01-01", "2026-07-25", bounds)).toBe("allTime");
  });

  it("falls through to quickRangeFromDates when bounds don't match", () => {
    expect(inferQuickRange("2026-07-19", "2026-07-25", { from: "2020-01-01", to: "2026-07-25" })).toBe("pastWeek");
  });

  it("works without bounds provided at all", () => {
    expect(inferQuickRange("2026-07-19", "2026-07-25")).toBe("pastWeek");
  });
});
