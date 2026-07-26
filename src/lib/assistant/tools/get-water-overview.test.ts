import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import { getWaterOverviewTool } from "./get-water-overview";

describe("getWaterOverviewTool", () => {
  it("reports null firstWaterCharge when there's never been water activity", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", energySpend: 10, totalSpend: 10 })];
    const context = buildTestContext(rows);

    const result = (await getWaterOverviewTool.handler({}, async () => context)) as {
      firstWaterCharge: unknown;
      waterChargeDays: number;
    };

    expect(result.firstWaterCharge).toBeNull();
    expect(result.waterChargeDays).toBe(0);
  });

  it("finds the first water charge across all-time rows even if it's outside the active scope", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-06-01", waterSpend: 5, waterKl: 1 }),
      dailyRow({ periodDate: "2026-07-01", waterSpend: 0, waterKl: 0 })
    ];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" });

    const result = (await getWaterOverviewTool.handler({}, async () => context)) as {
      firstWaterCharge: { date: string } | null;
      firstWaterChargeInScope: { date: string } | null;
    };

    expect(result.firstWaterCharge?.date).toBe("2026-06-01");
    // In-scope only sees 2026-07-01, which has no water activity.
    expect(result.firstWaterChargeInScope).toBeNull();
  });

  it("counts how many days in scope had water activity and computes daily averages", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-07-01", waterSpend: 10, waterKl: 2 }),
      dailyRow({ periodDate: "2026-07-02", waterSpend: 0, waterKl: 0 }),
      dailyRow({ periodDate: "2026-07-03", waterSpend: 6, waterKl: 1 })
    ];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-03" });

    const result = (await getWaterOverviewTool.handler({}, async () => context)) as {
      waterChargeDays: number;
      totalWaterSpend: number;
      averageWaterSpendPerDay: number;
    };

    expect(result.waterChargeDays).toBe(2);
    expect(result.totalWaterSpend).toBe(16);
    expect(result.averageWaterSpendPerDay).toBeCloseTo(16 / 3, 2);
  });

  it("identifies the highest water day", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-07-01", waterSpend: 3, waterKl: 0.5 }),
      dailyRow({ periodDate: "2026-07-02", waterSpend: 9, waterKl: 1.5 })
    ];
    const context = buildTestContext(rows);

    const result = (await getWaterOverviewTool.handler({}, async () => context)) as {
      highestWaterDay: { date: string; spend: number } | null;
    };

    expect(result.highestWaterDay?.date).toBe("2026-07-02");
    expect(result.highestWaterDay?.spend).toBe(9);
  });
});
