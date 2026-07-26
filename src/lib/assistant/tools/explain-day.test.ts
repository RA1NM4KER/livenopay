import { describe, expect, it, vi } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import type { IntervalRollupRow } from "@/lib/types";
import { explainDayTool } from "./explain-day";

const { loadDayIntervalRollupsMock } = vi.hoisted(() => ({
  loadDayIntervalRollupsMock: vi.fn<(accessToken: string, date: string) => Promise<IntervalRollupRow[]>>()
}));

vi.mock("@/lib/dashboard-data", () => ({
  loadDayIntervalRollups: loadDayIntervalRollupsMock
}));

function interval(overrides: Partial<IntervalRollupRow>): IntervalRollupRow {
  return { periodDate: "2026-07-01", periodTime: "00:00", spend: 0, kwh: 0, waterSpend: 0, waterKl: 0, ...overrides };
}

describe("explainDayTool", () => {
  it("reports found: false when the requested day has no daily rollup at all", async () => {
    const context = buildTestContext([dailyRow({ periodDate: "2026-07-01" })]);

    const result = (await explainDayTool.handler({ date: "2026-07-02" }, async () => context)) as {
      found: boolean;
    };

    expect(result.found).toBe(false);
    expect(loadDayIntervalRollupsMock).not.toHaveBeenCalled();
  });

  it("defaults to the scope's end date when no date argument is given", async () => {
    const context = buildTestContext([dailyRow({ periodDate: "2026-07-01" })], [], {
      from: "2026-07-01",
      to: "2026-07-01"
    });
    loadDayIntervalRollupsMock.mockResolvedValueOnce([]);

    const result = (await explainDayTool.handler({}, async () => context)) as { date: string; found: boolean };

    expect(result.date).toBe("2026-07-01");
    expect(result.found).toBe(true);
  });

  it("ranks the top spend/usage/water intervals independently, each by its own metric", async () => {
    const context = buildTestContext([dailyRow({ periodDate: "2026-07-01" })]);
    loadDayIntervalRollupsMock.mockResolvedValueOnce([
      interval({ periodTime: "08:00", spend: 5, kwh: 1, waterSpend: 9, waterKl: 0.1 }),
      interval({ periodTime: "09:00", spend: 9, kwh: 5, waterSpend: 1, waterKl: 0.9 })
    ]);

    const result = (await explainDayTool.handler({ date: "2026-07-01" }, async () => context)) as {
      topSpendIntervals: Array<{ time: string }>;
      topUsageIntervals: Array<{ time: string }>;
      topWaterIntervals: Array<{ time: string }>;
    };

    expect(result.topSpendIntervals[0].time).toBe("09:00"); // higher spend
    expect(result.topUsageIntervals[0].time).toBe("09:00"); // higher kwh
    expect(result.topWaterIntervals[0].time).toBe("08:00"); // higher waterSpend
  });

  it("caps each ranked list at 6 intervals", async () => {
    const context = buildTestContext([dailyRow({ periodDate: "2026-07-01" })]);
    loadDayIntervalRollupsMock.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => interval({ periodTime: `${String(index).padStart(2, "0")}:00`, spend: index }))
    );

    const result = (await explainDayTool.handler({ date: "2026-07-01" }, async () => context)) as {
      topSpendIntervals: unknown[];
    };

    expect(result.topSpendIntervals).toHaveLength(6);
  });
});
