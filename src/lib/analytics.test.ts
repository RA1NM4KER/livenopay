import { describe, expect, it } from "vitest";
import { createAnalytics } from "@/lib/analytics";
import type { DailyRollupRow, HourlyRollupRow } from "@/lib/types";

function dailyRow(overrides: Partial<DailyRollupRow>): DailyRollupRow {
  return {
    periodDate: "2026-07-01",
    energySpend: 0,
    waterSpend: 0,
    fixedSpend: 0,
    topupAmount: 0,
    totalSpend: 0,
    energyKwh: 0,
    waterKl: 0,
    weightedTariff: 0,
    peakTariff: 0,
    allInRate: 0,
    balanceEnd: 0,
    energyIntervals: 0,
    waterIntervals: 0,
    isComplete: true,
    ...overrides
  };
}

// Three ascending days: two complete, one still in progress ("today"),
// mirroring how dashboard-data.ts always hands rows over pre-sorted by
// period_date.asc.
const day1 = dailyRow({
  periodDate: "2026-07-01",
  energySpend: 50,
  waterSpend: 5,
  fixedSpend: 10,
  totalSpend: 65,
  energyKwh: 20,
  waterKl: 1,
  balanceEnd: 500,
  latestPeriod: "2026-07-01T23:30",
  isComplete: true
});

const day2 = dailyRow({
  periodDate: "2026-07-02",
  energySpend: 80,
  waterSpend: 0,
  fixedSpend: 10,
  totalSpend: 90,
  energyKwh: 30,
  waterKl: 0,
  balanceEnd: 410,
  latestPeriod: "2026-07-02T23:30",
  isComplete: true
});

const day3InProgress = dailyRow({
  periodDate: "2026-07-03",
  energySpend: 20,
  waterSpend: 2,
  fixedSpend: 10,
  totalSpend: 32,
  energyKwh: 8,
  waterKl: 0.4,
  balanceEnd: 378,
  latestPeriod: "2026-07-03T14:30", // 14:30 -> 30 half-hour slots elapsed
  isComplete: false
});

const dailyRows = [day1, day2, day3InProgress];

function hourlyRow(overrides: Partial<HourlyRollupRow>): HourlyRollupRow {
  return {
    periodDate: "2026-07-01",
    hour: 0,
    spend: 0,
    kwh: 0,
    waterSpend: 0,
    waterKl: 0,
    intervals: 0,
    waterIntervals: 0,
    ...overrides
  };
}

const hourlyRows = [
  hourlyRow({ periodDate: "2026-07-01", hour: 8, spend: 10, kwh: 4, waterSpend: 1, waterKl: 0.2, intervals: 2, waterIntervals: 2 }),
  hourlyRow({ periodDate: "2026-07-01", hour: 18, spend: 15, kwh: 6, intervals: 2 }),
  hourlyRow({ periodDate: "2026-07-02", hour: 18, spend: 25, kwh: 10, intervals: 2 }),
  hourlyRow({ periodDate: "2026-07-03", hour: 8, spend: 5, kwh: 2, waterSpend: 0.5, waterKl: 0.1, intervals: 1, waterIntervals: 1 })
];

describe("createAnalytics totals", () => {
  it("sums spend, usage, and fixed charges across all rows", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.totalSpend).toBe(187);
    expect(metrics.totalEnergySpend).toBe(150);
    expect(metrics.totalWaterSpend).toBe(7);
    expect(metrics.totalFixedSpend).toBe(30);
    expect(metrics.totalKwh).toBe(58);
    expect(metrics.totalWaterKl).toBeCloseTo(1.4, 5);
  });

  it("computes cost-per-kWh before and after fixed charges", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.energyCostPerKwh).toBe(2.59); // round(150 / 58)
    expect(metrics.allInCostPerKwh).toBe(3.1); // round((150 + 30) / 58)
  });

  it("returns 0 cost-per-kWh instead of dividing by zero when there's no usage", () => {
    const { metrics } = createAnalytics([dailyRow({ energyKwh: 0, energySpend: 0 })], []);
    expect(metrics.energyCostPerKwh).toBe(0);
    expect(metrics.allInCostPerKwh).toBe(0);
  });

  it("averages by day count", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.dayCount).toBe(3);
    expect(metrics.averageSpendPerDay).toBe(62.33); // round(187 / 3)
    expect(metrics.averageKwhPerDay).toBe(19.33); // round(58 / 3)
    expect(metrics.averageWaterKlPerDay).toBe(0.47); // round(1.4 / 3)
  });

  it("defaults dayCount to 1 (not 0) when there are no rows, to avoid a divide-by-zero", () => {
    const { metrics } = createAnalytics([], []);
    expect(metrics.dayCount).toBe(1);
    expect(metrics.totalSpend).toBe(0);
    expect(metrics.averageSpendPerDay).toBe(0);
  });
});

describe("createAnalytics peaks", () => {
  it("identifies the highest spend day", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.highestSpendDay?.date).toBe("2026-07-02");
    expect(metrics.highestSpendDay?.spend).toBe(90);
  });

  it("identifies the highest usage day", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.highestUsageDay?.date).toBe("2026-07-02");
    expect(metrics.highestUsageDay?.kwh).toBe(30);
  });

  it("identifies the highest water day even when it isn't the highest spend/usage day", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.highestWaterDay?.date).toBe("2026-07-01");
    expect(metrics.highestWaterDay?.waterKl).toBe(1);
  });

  it("identifies the single highest-usage half-hour-equivalent hour by kWh, grouped per day+hour", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    // 2026-07-02 18:00 has kwh=10, the single highest bucket even though
    // 2026-07-01 has two buckets that individually total less.
    expect(metrics.highestUsageHour).toEqual({ date: "2026-07-02", hour: "18:00", spend: 25, kwh: 10 });
  });
});

describe("createAnalytics latest balance/period", () => {
  it("falls back to the last filtered row's balance and period when no summary override is given", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows);
    expect(metrics.latestBalance).toBe(378);
    expect(metrics.latestPeriod).toBe("2026-07-03T14:30");
  });

  it("prefers the explicit summary override over the last row (summary reflects the true latest sync, which may be outside the filtered range)", () => {
    const { metrics } = createAnalytics(dailyRows, hourlyRows, undefined, undefined, {
      latestBalance: 999,
      latestPeriod: "2026-07-04T00:00"
    });
    expect(metrics.latestBalance).toBe(999);
    expect(metrics.latestPeriod).toBe("2026-07-04T00:00");
  });

  it("is undefined when there are no rows and no summary", () => {
    const { metrics } = createAnalytics([], []);
    expect(metrics.latestBalance).toBeUndefined();
    expect(metrics.latestPeriod).toBeUndefined();
  });
});

describe("createAnalytics date range filtering", () => {
  it("excludes rows outside the from/to range", () => {
    const { metrics, daily } = createAnalytics(dailyRows, hourlyRows, "2026-07-01", "2026-07-02");
    expect(daily).toHaveLength(2);
    expect(metrics.totalSpend).toBe(65 + 90);
    expect(metrics.dateStart).toBe("2026-07-01");
    expect(metrics.dateEnd).toBe("2026-07-02");
  });

  it("is inclusive of both endpoints", () => {
    const { daily } = createAnalytics(dailyRows, hourlyRows, "2026-07-02", "2026-07-02");
    expect(daily).toHaveLength(1);
    expect(daily[0].date).toBe("2026-07-02");
  });
});

describe("createAnalytics daily projections", () => {
  it("does not project spend/usage for a complete day", () => {
    const { daily } = createAnalytics(dailyRows, hourlyRows);
    const completedDay = daily.find((day) => day.date === "2026-07-01");
    expect(completedDay?.projectedSpend).toBeUndefined();
    expect(completedDay?.projectedKwh).toBeUndefined();
  });

  it("projects a full day's spend and usage once enough of an incomplete day has elapsed", () => {
    const { daily } = createAnalytics(dailyRows, hourlyRows);
    const inProgressDay = daily.find((day) => day.date === "2026-07-03");
    // 14:30 -> 30 half-hour slots elapsed. (energy+water spend 22 / 30) * 48 + fixed 10 = 45.2
    expect(inProgressDay?.projectedSpend).toBe(45.2);
    // (energyKwh 8 / 30) * 48 = 12.8
    expect(inProgressDay?.projectedKwh).toBe(12.8);
  });

  it("does not project when too little of the day has elapsed (fewer than 12 half-hour slots / 6 hours)", () => {
    const earlyDay = dailyRow({
      periodDate: "2026-07-05",
      energySpend: 5,
      totalSpend: 5,
      energyKwh: 2,
      latestPeriod: "2026-07-05T02:00", // 4 slots elapsed
      isComplete: false
    });
    const { daily } = createAnalytics([earlyDay], []);
    expect(daily[0].projectedSpend).toBeUndefined();
    expect(daily[0].projectedKwh).toBeUndefined();
  });

  it("tracks a running cumulative spend total across the sorted days", () => {
    const { daily } = createAnalytics(dailyRows, hourlyRows);
    expect(daily.map((day) => day.cumulativeSpend)).toEqual([65, 155, 187]);
  });
});

describe("createAnalytics insights", () => {
  it("includes a fixed-charges insight when fixed spend is present", () => {
    const { insights } = createAnalytics(dailyRows, hourlyRows);
    expect(insights.some((insight) => insight.title === "Fixed charges")).toBe(true);
  });

  it("includes a water-charges insight when water spend or usage is present", () => {
    const { insights } = createAnalytics(dailyRows, hourlyRows);
    expect(insights.some((insight) => insight.title === "Water charges")).toBe(true);
  });

  it("omits the water-charges insight when there's no water activity at all", () => {
    const noWaterDay = dailyRow({ periodDate: "2026-07-01", energySpend: 10, totalSpend: 10, energyKwh: 5 });
    const { insights } = createAnalytics([noWaterDay], []);
    expect(insights.some((insight) => insight.title === "Water charges")).toBe(false);
  });

  it("returns an empty insights array (not a throw) for an empty range", () => {
    const { insights } = createAnalytics([], []);
    expect(insights).toEqual([]);
  });
});
