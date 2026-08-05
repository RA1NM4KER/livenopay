import { describe, expect, it, vi } from "vitest";
import { buildTestContext, dailyRow } from "@/lib/assistant/test-fixtures";
import type { LatestCaptureRun } from "@/lib/energy-data";
import { getDataStatusTool } from "./get-data-status";

const { loadLatestCaptureRunMock } = vi.hoisted(() => ({
  loadLatestCaptureRunMock: vi.fn<(accessToken: string) => Promise<LatestCaptureRun | null>>()
}));

vi.mock("@/lib/energy-data", () => ({
  loadLatestCaptureRun: loadLatestCaptureRunMock
}));

type Result = {
  lastSyncedAt: string | null;
  rowsInCsv: number | null;
  rowsSynced: number | null;
  latestDate: string | null;
  latestDateComplete: boolean | null;
  incompleteDateCount: number;
  incompleteDates: string[];
  possibleGapDateCount: number;
  possibleGapDates: string[];
  gapDetectionRule: string;
  latestCaptureRun: {
    status: string;
    startedAt: string;
    finishedAt: string | null;
    errorPresent: boolean;
    safeErrorMessage: string | null;
  } | null;
};

describe("getDataStatusTool", () => {
  it("reports nulls and zero counts when there is no data at all", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const context = buildTestContext([], [], { from: "", to: "" });

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.latestDate).toBeNull();
    expect(result.latestDateComplete).toBeNull();
    expect(result.incompleteDateCount).toBe(0);
    expect(result.incompleteDates).toEqual([]);
    expect(result.possibleGapDateCount).toBe(0);
    expect(result.latestCaptureRun).toBeNull();
  });

  it("reports latestDateComplete true when the latest day reached full coverage", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const rows = [dailyRow({ periodDate: "2026-07-01", isComplete: true, energyIntervals: 48 })];
    const context = buildTestContext(
      rows,
      [],
      { from: "2026-07-01", to: "2026-07-01" },
      { summary: { dateEnd: "2026-07-01" } }
    );

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.latestDate).toBe("2026-07-01");
    expect(result.latestDateComplete).toBe(true);
    expect(result.incompleteDateCount).toBe(0);
  });

  it("reports latestDateComplete false for a still-accruing latest day, without treating it as a gap", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const rows = [
      dailyRow({ periodDate: "2026-07-01", isComplete: true, energyIntervals: 48 }),
      dailyRow({ periodDate: "2026-07-02", isComplete: false, energyIntervals: 20 })
    ];
    const context = buildTestContext(
      rows,
      [],
      { from: "2026-07-01", to: "2026-07-02" },
      { summary: { dateEnd: "2026-07-02" } }
    );

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.latestDate).toBe("2026-07-02");
    expect(result.latestDateComplete).toBe(false);
    expect(result.incompleteDateCount).toBe(1);
    expect(result.incompleteDates).toEqual(["2026-07-02"]);
    // The latest, still-accruing day is not itself flagged as a gap.
    expect(result.possibleGapDateCount).toBe(0);
    expect(result.possibleGapDates).toEqual([]);
  });

  it("flags an incomplete day buried earlier in history as a possible gap", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const rows = [
      dailyRow({ periodDate: "2026-06-15", isComplete: false, energyIntervals: 10 }),
      dailyRow({ periodDate: "2026-07-01", isComplete: true, energyIntervals: 48 })
    ];
    const context = buildTestContext(
      rows,
      [],
      { from: "2026-06-01", to: "2026-07-01" },
      { summary: { dateEnd: "2026-07-01" } }
    );

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.incompleteDateCount).toBe(1);
    expect(result.possibleGapDateCount).toBe(1);
    expect(result.possibleGapDates).toEqual(["2026-06-15"]);
    expect(result.gapDetectionRule).toContain("energyIntervalsBelowExpected");
  });

  it("lists multiple incomplete dates, most recent first, and reports the true count separately from the limited list", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const rows = [
      dailyRow({ periodDate: "2026-06-01", isComplete: false, energyIntervals: 5 }),
      dailyRow({ periodDate: "2026-06-02", isComplete: false, energyIntervals: 5 }),
      dailyRow({ periodDate: "2026-06-03", isComplete: false, energyIntervals: 5 }),
      dailyRow({ periodDate: "2026-07-01", isComplete: true, energyIntervals: 48 })
    ];
    const context = buildTestContext(
      rows,
      [],
      { from: "2026-06-01", to: "2026-07-01" },
      { summary: { dateEnd: "2026-07-01" } }
    );

    const result = (await getDataStatusTool.handler({ limit: 2 }, async () => context)) as Result;

    expect(result.incompleteDateCount).toBe(3);
    expect(result.incompleteDates).toEqual(["2026-06-03", "2026-06-02"]);
  });

  it("returns null lastSyncedAt when sync metadata is missing", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const context = buildTestContext([], [], { from: "", to: "" }, { summary: {} });

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.lastSyncedAt).toBeNull();
    expect(result.rowsInCsv).toBeNull();
    expect(result.rowsSynced).toBeNull();
  });

  it("surfaces sync metadata when available", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce(null);
    const context = buildTestContext(
      [],
      [],
      { from: "", to: "" },
      { summary: { lastSyncedAt: "2026-07-01T02:00:00Z", rowsInCsv: 500, rowsSynced: 480 } }
    );

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.lastSyncedAt).toBe("2026-07-01T02:00:00Z");
    expect(result.rowsInCsv).toBe(500);
    expect(result.rowsSynced).toBe(480);
  });

  it("surfaces the latest capture run's status without the raw error string", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce({
      status: "failed",
      startedAt: "2026-07-01T02:00:00Z",
      finishedAt: "2026-07-01T02:05:00Z",
      error: "Upstream timeout"
    });
    const context = buildTestContext([], [], { from: "", to: "" });

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.latestCaptureRun).toEqual({
      status: "failed",
      startedAt: "2026-07-01T02:00:00Z",
      finishedAt: "2026-07-01T02:05:00Z",
      errorPresent: true,
      safeErrorMessage: "The latest sync attempt failed."
    });
    expect(result.latestCaptureRun).not.toHaveProperty("error");
  });

  it("never forwards a sensitive raw error string, regardless of what the sync worker stored", async () => {
    const sensitiveError = "postgres connection failed at internal-host.example with token abc123";
    loadLatestCaptureRunMock.mockResolvedValueOnce({
      status: "failed",
      startedAt: "2026-07-01T02:00:00Z",
      finishedAt: "2026-07-01T02:05:00Z",
      error: sensitiveError
    });
    const context = buildTestContext([], [], { from: "", to: "" });

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain(sensitiveError);
    expect(serialized).not.toContain("internal-host.example");
    expect(serialized).not.toContain("abc123");
    expect(result.latestCaptureRun?.errorPresent).toBe(true);
    expect(result.latestCaptureRun?.safeErrorMessage).toBe("The latest sync attempt failed.");
  });

  it("reports errorPresent false and no safe message for a successful run with no stored error", async () => {
    loadLatestCaptureRunMock.mockResolvedValueOnce({
      status: "success",
      startedAt: "2026-07-01T02:00:00Z",
      finishedAt: "2026-07-01T02:05:00Z",
      error: null
    });
    const context = buildTestContext([], [], { from: "", to: "" });

    const result = (await getDataStatusTool.handler({}, async () => context)) as Result;

    expect(result.latestCaptureRun?.errorPresent).toBe(false);
    expect(result.latestCaptureRun?.safeErrorMessage).toBeNull();
  });

  it("clamps limit between 1 and 30", async () => {
    loadLatestCaptureRunMock.mockResolvedValue(null);
    const rows = Array.from({ length: 5 }, (_, index) =>
      dailyRow({ periodDate: `2026-06-0${index + 1}`, isComplete: false, energyIntervals: 5 })
    );
    const context = buildTestContext(
      rows,
      [],
      { from: "2026-06-01", to: "2026-06-05" },
      { summary: { dateEnd: "2026-06-05" } }
    );

    const result = (await getDataStatusTool.handler({ limit: 999 }, async () => context)) as Result;
    expect(result.incompleteDates).toHaveLength(5); // clamped to 30, only 5 exist

    const underLimit = (await getDataStatusTool.handler({ limit: 0 }, async () => context)) as Result;
    expect(underLimit.incompleteDates).toHaveLength(1); // clamped up to 1
  });
});
