import { describe, expect, it } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import { getBalanceRunoutTool } from "./get-balance-runout";

describe("getBalanceRunoutTool", () => {
  it("estimates the runout date from the latest balance and average daily spend", async () => {
    const rows = [
      dailyRow({ periodDate: "2026-07-01", totalSpend: 20, balanceEnd: 200 }),
      dailyRow({ periodDate: "2026-07-02", totalSpend: 20, balanceEnd: 180 })
    ];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-02" });

    const result = (await getBalanceRunoutTool.handler({}, async () => context)) as {
      available: boolean;
      daysRemaining: number;
      runoutDate: string;
      coversMonthEnd: boolean;
    };

    expect(result.available).toBe(true);
    // latestBalance 180 / averageSpendPerDay 20 = 9 days remaining
    expect(result.daysRemaining).toBe(9);
    expect(result.runoutDate).toBe("2026-07-11"); // 2026-07-02 + 9 days
    expect(result.coversMonthEnd).toBe(false); // runs out well before July 31
  });

  it("reports coversMonthEnd true when the balance outlasts the rest of the month", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 1, balanceEnd: 1000 })];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" });

    const result = (await getBalanceRunoutTool.handler({}, async () => context)) as { coversMonthEnd: boolean };
    expect(result.coversMonthEnd).toBe(true);
  });

  it("reports unavailable with reason missing_balance when there's no latest balance", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 20, balanceEnd: 0 })];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" }, { summary: {} });
    // Force latestBalance to be genuinely absent rather than 0.
    context.analytics.metrics.latestBalance = undefined;

    const result = (await getBalanceRunoutTool.handler({}, async () => context)) as {
      available: boolean;
      reason: string;
    };

    expect(result.available).toBe(false);
    expect(result.reason).toBe("missing_balance");
  });

  it("reports unavailable with reason missing_average_spend when average spend is zero", async () => {
    const rows = [dailyRow({ periodDate: "2026-07-01", totalSpend: 0, balanceEnd: 100 })];
    const context = buildTestContext(rows, [], { from: "2026-07-01", to: "2026-07-01" });

    const result = (await getBalanceRunoutTool.handler({}, async () => context)) as {
      available: boolean;
      reason: string;
    };

    expect(result.available).toBe(false);
    expect(result.reason).toBe("missing_average_spend");
  });

  it("reports unavailable with reason missing_date when there's no date to anchor from", async () => {
    const context = buildTestContext([], [], { from: "", to: "" });

    const result = (await getBalanceRunoutTool.handler({}, async () => context)) as {
      available: boolean;
      reason: string;
    };

    expect(result.available).toBe(false);
    expect(result.reason).toBe("missing_date");
  });
});
