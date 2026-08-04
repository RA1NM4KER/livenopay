import { describe, expect, it } from "vitest";
import { buildDailySpendChartModel } from "./daily-spend-chart-model";
import type { DailyPoint } from "@/lib/types";

function point(overrides: Partial<DailyPoint>): DailyPoint {
  return {
    date: "2026-08-01",
    spend: 0,
    kwh: 0,
    waterSpend: 0,
    waterKl: 0,
    averageTariff: 0,
    balance: 0,
    cumulativeSpend: 0,
    energyIntervals: 48,
    waterIntervals: 48,
    isComplete: true,
    ...overrides
  };
}

describe("buildDailySpendChartModel", () => {
  it("separates completed history from today's partial segment", () => {
    const previous = point({ date: "2026-08-03", spend: 30 });
    const current = point({
      date: "2026-08-04",
      spend: 21,
      projectedSpend: 53,
      isComplete: false
    });
    const model = buildDailySpendChartModel([previous, current]);

    expect(model.chartData[1].actualSpend).toBeNull();
    expect(model.chartData[1].currentSpend).toBe(21);
    expect(model.currentDaySegment).toEqual([
      { x: "2026-08-03", y: 30 },
      { x: "2026-08-04", y: 21 }
    ]);
    expect(model.chartData[1].projectedSpendValue).toBe(53);
  });

  it("keeps complete data solid and creates no provisional segments", () => {
    const complete = point({ spend: 40 });
    const model = buildDailySpendChartModel([complete]);

    expect(model.chartData[0].actualSpend).toBe(40);
    expect(model.currentDaySegment).toBeUndefined();
  });

  it("excludes today's partial spend from the completed-day average", () => {
    const model = buildDailySpendChartModel([
      point({ date: "2026-08-01", spend: 40 }),
      point({ date: "2026-08-02", spend: 60 }),
      point({ date: "2026-08-03", spend: 20, projectedSpend: 55, isComplete: false })
    ]);

    expect(model.completedDays).toHaveLength(2);
    expect(model.averageSpend).toBe(50);
  });
});
