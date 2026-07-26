import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import { getScopeOverviewTool } from "./get-scope-overview";

describe("getScopeOverviewTool", () => {
  it("counts incomplete days within the active scope", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-07-01", isComplete: true }),
      dailyRow({ periodDate: "2026-07-02", isComplete: false })
    ];
    const context = buildTestContext(rows);

    const result = (await getScopeOverviewTool.handler({}, async () => context)) as { incompleteDays: number };
    expect(result.incompleteDays).toBe(1);
  });

  it("surfaces the scope, metrics, highlights, and insights together", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 50, fixedSpend: 5 })];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" });

    const result = (await getScopeOverviewTool.handler({}, async () => context)) as {
      scope: { from: string; to: string };
      metrics: { totalSpend: number };
      highlights: { highestSpendDay: { date: string } | null };
      insights: unknown[];
    };

    expect(result.scope).toEqual({ from: "2026-07-01", to: "2026-07-01" });
    expect(result.metrics.totalSpend).toBe(50);
    expect(result.highlights.highestSpendDay?.date).toBe("2026-07-01");
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it("reports 0 incomplete days for an empty range instead of throwing", async () => {
    const context = buildTestContext([]);
    const result = (await getScopeOverviewTool.handler({}, async () => context)) as { incompleteDays: number };
    expect(result.incompleteDays).toBe(0);
  });
});
