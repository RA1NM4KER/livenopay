import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import { compareCalendarMonthsTool } from "./compare-calendar-months";

describe("compareCalendarMonthsTool", () => {
  it("buckets rows by calendar month and compares the latest two", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-06-15", totalSpend: 40, energyKwh: 10, balanceEnd: 300 }),
      dailyRow({ periodDate: "2026-06-16", totalSpend: 30, energyKwh: 10, balanceEnd: 270 }),
      dailyRow({ periodDate: "2026-07-01", totalSpend: 50, energyKwh: 20, balanceEnd: 220 }),
      dailyRow({ periodDate: "2026-07-02", totalSpend: 60, energyKwh: 20, balanceEnd: 160 })
    ];
    const context = buildTestContext(rows);

    const result = (await compareCalendarMonthsTool.handler({}, async () => context)) as {
      months: Array<{ month: string; spend: number; dayCount: number }>;
      current: { month: string; spend: number } | null;
      previous: { month: string; spend: number } | null;
      deltas: { spend: number; kwh: number; latestBalance: number } | null;
    };

    expect(result.months.map((month) => month.month)).toEqual(["2026-06", "2026-07"]);
    expect(result.current?.month).toBe("2026-07");
    expect(result.current?.spend).toBe(110);
    expect(result.previous?.month).toBe("2026-06");
    expect(result.previous?.spend).toBe(70);
    expect(result.deltas?.spend).toBe(40); // 110 - 70
    expect(result.deltas?.kwh).toBe(20); // 40 - 20
    expect(result.deltas?.latestBalance).toBe(-110); // 160 - 270 (last row's balance per month)
  });

  it("includes energyCostPerKwh and allInCostPerKwh per month, and their deltas", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-06-15", totalSpend: 40, energySpend: 30, energyKwh: 10 }),
      dailyRow({ periodDate: "2026-07-01", totalSpend: 60, energySpend: 50, energyKwh: 20 })
    ];
    const context = buildTestContext(rows);

    const result = (await compareCalendarMonthsTool.handler({}, async () => context)) as {
      current: { energyCostPerKwh: number; allInCostPerKwh: number } | null;
      previous: { energyCostPerKwh: number; allInCostPerKwh: number } | null;
      deltas: { energyCostPerKwh: number; allInCostPerKwh: number } | null;
    };

    // June: energySpend 30 / kwh 10 = 3; totalSpend 40 / kwh 10 = 4
    expect(result.previous?.energyCostPerKwh).toBe(3);
    expect(result.previous?.allInCostPerKwh).toBe(4);
    // July: energySpend 50 / kwh 20 = 2.5; totalSpend 60 / kwh 20 = 3
    expect(result.current?.energyCostPerKwh).toBe(2.5);
    expect(result.current?.allInCostPerKwh).toBe(3);
    expect(result.deltas?.energyCostPerKwh).toBe(-0.5); // 2.5 - 3
    expect(result.deltas?.allInCostPerKwh).toBe(-1); // 3 - 4
  });

  it("returns zero cost-per-kwh instead of dividing by zero when a month has no kwh usage", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 5, energySpend: 5, energyKwh: 0 })];
    const context = buildTestContext(rows);

    const result = (await compareCalendarMonthsTool.handler({}, async () => context)) as {
      current: { energyCostPerKwh: number; allInCostPerKwh: number } | null;
    };

    expect(result.current?.energyCostPerKwh).toBe(0);
    expect(result.current?.allInCostPerKwh).toBe(0);
  });

  it("returns null current/previous/deltas when there's only one month of data", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 10 })];
    const context = buildTestContext(rows);

    const result = (await compareCalendarMonthsTool.handler({}, async () => context)) as {
      current: unknown;
      previous: unknown;
      deltas: unknown;
    };

    expect(result.current).not.toBeNull();
    expect(result.previous).toBeNull();
    expect(result.deltas).toBeNull();
  });

  it("returns an empty months list (not a throw) for no data", async () => {
    const context = buildTestContext([]);
    const result = (await compareCalendarMonthsTool.handler({}, async () => context)) as { months: unknown[] };
    expect(result.months).toEqual([]);
  });

  it("respects the active scope, excluding rows outside from/to", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-06-15", totalSpend: 999 }),
      dailyRow({ periodDate: "2026-07-01", totalSpend: 50 })
    ];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-31" });

    const result = (await compareCalendarMonthsTool.handler({}, async () => context)) as {
      months: Array<{ month: string }>;
    };

    expect(result.months).toHaveLength(1);
    expect(result.months[0].month).toBe("2026-07");
  });
});
