import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import { comparePreviousPeriodTool } from "./compare-previous-period";

describe("comparePreviousPeriodTool", () => {
  it("compares the active scope against the immediately preceding range of equal length", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-06-24", totalSpend: 20, energyKwh: 10 }), // previous week
      dailyRow({ periodDate: "2026-06-30", totalSpend: 30, energyKwh: 15 }), // previous week
      dailyRow({ periodDate: "2026-07-01", totalSpend: 50, energyKwh: 20 }), // current week
      dailyRow({ periodDate: "2026-07-07", totalSpend: 70, energyKwh: 25 }) // current week
    ];
    const scope = { from: "2026-07-01", to: "2026-07-07" };
    const context = buildTestContext(rows, [], scope);

    const result = (await comparePreviousPeriodTool.handler({}, async () => context)) as {
      currentScope: typeof scope;
      previousScope: { from: string; to: string };
      current: { totalSpend: number };
      previous: { totalSpend: number };
      deltas: { spend: number; kwh: number };
    };

    expect(result.currentScope).toEqual(scope);
    expect(result.previousScope).toEqual({ from: "2026-06-24", to: "2026-06-30" });
    expect(result.current.totalSpend).toBe(120); // 50 + 70
    expect(result.previous.totalSpend).toBe(50); // 20 + 30
    expect(result.deltas.spend).toBe(70); // 120 - 50
    expect(result.deltas.kwh).toBe(20); // 45 - 25
  });

  it("returns null latestBalance delta when either side is missing a balance", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 10 })];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" });

    const result = (await comparePreviousPeriodTool.handler({}, async () => context)) as {
      deltas: { latestBalance: number | null };
    };

    // No rows fall in the previous-period window, so previous.latestBalance
    // is undefined -- the delta must degrade to null, not NaN or a
    // misleading number computed against undefined.
    expect(result.deltas.latestBalance).toBeNull();
  });

  it("computes a real latestBalance delta when both periods have data", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-06-30", balanceEnd: 400 }),
      dailyRow({ periodDate: "2026-07-01", balanceEnd: 300 })
    ];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" });

    const result = (await comparePreviousPeriodTool.handler({}, async () => context)) as {
      deltas: { latestBalance: number | null };
    };

    expect(result.deltas.latestBalance).toBe(-100); // 300 - 400
  });
});
