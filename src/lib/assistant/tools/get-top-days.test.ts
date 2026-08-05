import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import { getTopDaysTool } from "./get-top-days";

const rows = [
  dailyRow({ periodDate: "2026-07-01", totalSpend: 10, energyKwh: 5, weightedTariff: 2 }),
  dailyRow({ periodDate: "2026-07-02", totalSpend: 30, energyKwh: 2, weightedTariff: 4 }),
  dailyRow({ periodDate: "2026-07-03", totalSpend: 20, energyKwh: 8, weightedTariff: 1 })
];

describe("getTopDaysTool", () => {
  it("defaults to ranking by spend when no metric is given", async () => {
    const context = buildTestContext(rows);
    const result = (await getTopDaysTool.handler({}, async () => context)) as {
      metric: string;
      rows: Array<{ date: string }>;
    };

    expect(result.metric).toBe("spend");
    expect(result.rows.map((row) => row.date)).toEqual(["2026-07-02", "2026-07-03", "2026-07-01"]);
  });

  it("ranks by kwh when requested", async () => {
    const context = buildTestContext(rows);
    const result = (await getTopDaysTool.handler({ metric: "kwh" }, async () => context)) as {
      rows: Array<{ date: string }>;
    };

    expect(result.rows.map((row) => row.date)).toEqual(["2026-07-03", "2026-07-01", "2026-07-02"]);
  });

  it("ranks by tariff when requested", async () => {
    const context = buildTestContext(rows);
    const result = (await getTopDaysTool.handler({ metric: "tariff" }, async () => context)) as {
      rows: Array<{ date: string }>;
    };

    expect(result.rows.map((row) => row.date)).toEqual(["2026-07-02", "2026-07-01", "2026-07-03"]);
  });

  it("falls back to spend for an unrecognized metric instead of throwing", async () => {
    const context = buildTestContext(rows);
    const result = (await getTopDaysTool.handler({ metric: "bogus" }, async () => context)) as { metric: string };
    expect(result.metric).toBe("spend");
  });

  it("ranks by waterKl, excluding days with zero water usage", async () => {
    const waterRows = [
      dailyRow({ periodDate: "2026-07-01", waterKl: 0, waterSpend: 0 }),
      dailyRow({ periodDate: "2026-07-02", waterKl: 3, waterSpend: 30 }),
      dailyRow({ periodDate: "2026-07-03", waterKl: 0, waterSpend: 0 }),
      dailyRow({ periodDate: "2026-07-04", waterKl: 1, waterSpend: 10 })
    ];
    const context = buildTestContext(waterRows);
    const result = (await getTopDaysTool.handler({ metric: "waterKl" }, async () => context)) as {
      rows: Array<{ date: string; waterKl: number }>;
    };

    expect(result.rows.map((row) => row.date)).toEqual(["2026-07-02", "2026-07-04"]);
    expect(result.rows.every((row) => row.waterKl > 0)).toBe(true);
  });

  it("ranks by waterSpend and returns correctly named fields, not a kwh alias", async () => {
    const waterRows = [
      dailyRow({ periodDate: "2026-07-01", waterKl: 1, waterSpend: 5 }),
      dailyRow({ periodDate: "2026-07-02", waterKl: 2, waterSpend: 15 })
    ];
    const context = buildTestContext(waterRows);
    const result = (await getTopDaysTool.handler({ metric: "waterSpend" }, async () => context)) as {
      metric: string;
      rows: Array<{ date: string; waterSpend: number; waterKl: number; metricValue: number }>;
    };

    expect(result.metric).toBe("waterSpend");
    expect(result.rows[0].date).toBe("2026-07-02");
    expect(result.rows[0].waterSpend).toBe(15);
    expect(result.rows[0].waterKl).toBe(2);
    expect(result.rows[0].metricValue).toBe(15);
  });

  it("returns no rows when ranking by a water metric and no day has water activity", async () => {
    const context = buildTestContext(rows); // none of these rows have water charges
    const result = (await getTopDaysTool.handler({ metric: "waterKl" }, async () => context)) as {
      rows: unknown[];
    };

    expect(result.rows).toHaveLength(0);
  });

  it("respects the limit argument, clamped between 1 and 10", async () => {
    const context = buildTestContext(rows);
    const limited = (await getTopDaysTool.handler({ limit: 2 }, async () => context)) as { rows: unknown[] };
    expect(limited.rows).toHaveLength(2);

    const overLimit = (await getTopDaysTool.handler({ limit: 999 }, async () => context)) as { rows: unknown[] };
    expect(overLimit.rows).toHaveLength(3); // clamped to 10, but only 3 rows exist

    const underLimit = (await getTopDaysTool.handler({ limit: 0 }, async () => context)) as { rows: unknown[] };
    expect(underLimit.rows).toHaveLength(1); // clamped up to 1
  });

  it("defaults the limit to 5 when omitted or not finite", async () => {
    const manyRows = Array.from({ length: 8 }, (_, index) =>
      dailyRow({ periodDate: `2026-07-${String(index + 1).padStart(2, "0")}`, totalSpend: index })
    );
    const context = buildTestContext(manyRows);
    const result = (await getTopDaysTool.handler({}, async () => context)) as { rows: unknown[] };
    expect(result.rows).toHaveLength(5);
  });
});
