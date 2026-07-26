import { describe, expect, it, vi } from "vitest";
import { buildTestContext } from "@/lib/assistant/test-fixtures";
import type { EnergyRow } from "@/lib/types";
import { getRecentTopupsTool } from "./get-recent-topups";

const { loadExportRowsMock } = vi.hoisted(() => ({
  loadExportRowsMock: vi.fn<(...args: unknown[]) => Promise<EnergyRow[]>>()
}));

vi.mock("@/lib/energy-data", () => ({
  loadExportRows: loadExportRowsMock
}));

function topupRow(overrides: Partial<EnergyRow>): EnergyRow {
  return {
    chargeKind: "topup",
    captureTimestamp: 0,
    captureDateTime: "2026-07-01 10:00",
    ledgerTimestamp: 0,
    chargeLabel: "Top Up",
    periodTimestamp: 0,
    periodDateTime: "2026-07-01T10:00",
    periodDate: "2026-07-01",
    periodTime: "10:00",
    hour: 10,
    kwh: 0,
    waterKl: 0,
    usageAmount: 0,
    usageUnit: null,
    tariff: 0,
    cost: 100,
    balance: 500,
    ...overrides
  };
}

describe("getRecentTopupsTool", () => {
  it("requests only topup rows, sorted by captured desc, for the active scope", async () => {
    loadExportRowsMock.mockResolvedValueOnce([]);
    const context = buildTestContext([], [], { from: "2026-07-01", to: "2026-07-31" });

    await getRecentTopupsTool.handler({}, async () => context);

    expect(loadExportRowsMock).toHaveBeenCalledWith("test-token", {
      from: "2026-07-01",
      to: "2026-07-31",
      chargeType: "topup",
      sortKey: "captured",
      sortDirection: "desc"
    });
  });

  it("maps rows to a compact topup summary", async () => {
    loadExportRowsMock.mockResolvedValueOnce([topupRow({ cost: 150, balance: 650 })]);
    const context = buildTestContext([]);

    const result = (await getRecentTopupsTool.handler({}, async () => context)) as {
      count: number;
      topups: Array<{ amount: number; balanceAfter: number }>;
    };

    expect(result.count).toBe(1);
    expect(result.topups[0].amount).toBe(150);
    expect(result.topups[0].balanceAfter).toBe(650);
  });

  it("clamps the limit between 1 and 20", async () => {
    const rows = Array.from({ length: 25 }, (_, index) => topupRow({ cost: index }));
    loadExportRowsMock.mockResolvedValueOnce(rows);
    const context = buildTestContext([]);

    const result = (await getRecentTopupsTool.handler({ limit: 999 }, async () => context)) as {
      topups: unknown[];
    };

    expect(result.topups).toHaveLength(20);
  });

  it("defaults to a limit of 10 when no limit is given", async () => {
    const rows = Array.from({ length: 15 }, (_, index) => topupRow({ cost: index }));
    loadExportRowsMock.mockResolvedValueOnce(rows);
    const context = buildTestContext([]);

    const result = (await getRecentTopupsTool.handler({}, async () => context)) as { topups: unknown[] };
    expect(result.topups).toHaveLength(10);
  });

  it("reports the true total count even when the returned list is truncated by limit", async () => {
    const rows = Array.from({ length: 15 }, (_, index) => topupRow({ cost: index }));
    loadExportRowsMock.mockResolvedValueOnce(rows);
    const context = buildTestContext([]);

    const result = (await getRecentTopupsTool.handler({ limit: 3 }, async () => context)) as {
      count: number;
      topups: unknown[];
    };

    expect(result.count).toBe(15);
    expect(result.topups).toHaveLength(3);
  });
});
