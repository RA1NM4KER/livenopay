import { describe, expect, it } from "vitest";
import { percentChange, previousComparableScope } from "@/lib/period-comparison";

describe("previousComparableScope", () => {
  it("returns the immediately preceding range of the same length", () => {
    const result = previousComparableScope({ from: "2026-07-08", to: "2026-07-14" });
    // current range is 7 days (inclusive) -> previous range should also be
    // 7 days, ending the day before "from".
    expect(result).toEqual({ from: "2026-07-01", to: "2026-07-07" });
  });

  it("handles a single-day range", () => {
    const result = previousComparableScope({ from: "2026-07-14", to: "2026-07-14" });
    expect(result).toEqual({ from: "2026-07-13", to: "2026-07-13" });
  });

  it("handles a range that crosses a month boundary", () => {
    const result = previousComparableScope({ from: "2026-08-01", to: "2026-08-05" });
    // 5-day current range -> 5-day previous range ending 2026-07-31.
    expect(result).toEqual({ from: "2026-07-27", to: "2026-07-31" });
  });

  it("handles a range that crosses a year boundary", () => {
    const result = previousComparableScope({ from: "2026-01-01", to: "2026-01-03" });
    expect(result).toEqual({ from: "2025-12-29", to: "2025-12-31" });
  });
});

describe("percentChange", () => {
  it("computes the percentage difference", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
  });

  it("returns null when the previous value is zero (avoids divide-by-zero)", () => {
    expect(percentChange(100, 0)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(percentChange(Number.NaN, 100)).toBeNull();
    expect(percentChange(100, Number.NaN)).toBeNull();
    expect(percentChange(Number.POSITIVE_INFINITY, 100)).toBeNull();
  });

  it("returns 0 when current equals previous", () => {
    expect(percentChange(100, 100)).toBe(0);
  });
});
