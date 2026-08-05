import { describe, expect, it, vi } from "vitest";
import { createAssistantToolbox } from "./index";
import type { DailyRollupRow, DashboardSummary, HourlyRollupRow } from "@/lib/types";

const { loadDashboardSummaryMock, loadDashboardDailyRollupsMock, loadDashboardHourlyRollupsMock } = vi.hoisted(() => ({
  loadDashboardSummaryMock: vi.fn<(accessToken: string) => Promise<DashboardSummary>>(),
  loadDashboardDailyRollupsMock: vi.fn<(accessToken: string) => Promise<DailyRollupRow[]>>(),
  loadDashboardHourlyRollupsMock: vi.fn<(accessToken: string) => Promise<HourlyRollupRow[]>>()
}));

vi.mock("@/lib/dashboard-data", () => ({
  loadDashboardSummary: loadDashboardSummaryMock,
  loadDashboardDailyRollups: loadDashboardDailyRollupsMock,
  loadDashboardHourlyRollups: loadDashboardHourlyRollupsMock
}));

const baseToolNames = [
  "get_scope_overview",
  "get_balance_runout",
  "compare_previous_period",
  "compare_calendar_months",
  "get_top_days",
  "get_top_hours",
  "explain_day",
  "get_recent_topups",
  "get_water_overview",
  "get_data_status"
];

function toolNames(toolbox: ReturnType<typeof createAssistantToolbox>) {
  return toolbox.tools.map((tool) => tool.function.name);
}

describe("createAssistantToolbox permission-aware registration", () => {
  it("registers 10 tools, without get_activity_report, when Activities are disabled", () => {
    const toolbox = createAssistantToolbox("token", {}, { activitiesEnabled: false });
    const names = toolNames(toolbox);

    expect(names).toHaveLength(10);
    expect(names).not.toContain("get_activity_report");
    for (const name of baseToolNames) {
      expect(names).toContain(name);
    }
  });

  it("registers 11 tools, including get_activity_report, when Activities are enabled", () => {
    const toolbox = createAssistantToolbox("token", {}, { activitiesEnabled: true });
    const names = toolNames(toolbox);

    expect(names).toHaveLength(11);
    expect(names).toContain("get_activity_report");
    for (const name of baseToolNames) {
      expect(names).toContain(name);
    }
  });

  it("rejects a call to get_activity_report when Activities are disabled, as an unknown tool", async () => {
    const toolbox = createAssistantToolbox("token", {}, { activitiesEnabled: false });

    await expect(toolbox.execute("get_activity_report", {})).rejects.toThrow("Unknown assistant tool");
  });
});

describe("createAssistantToolbox shared dashboard context under concurrent execution", () => {
  it("loads dashboard summary/daily/hourly data only once, even when multiple tools execute concurrently", async () => {
    loadDashboardSummaryMock.mockReset().mockResolvedValue({ dateStart: "2026-07-01", dateEnd: "2026-07-31" });
    loadDashboardDailyRollupsMock.mockReset().mockResolvedValue([]);
    loadDashboardHourlyRollupsMock.mockReset().mockResolvedValue([]);

    const toolbox = createAssistantToolbox("token", {}, { activitiesEnabled: false });

    // Mirrors how openai.ts's Promise.all fires several tool calls from one
    // assistant message concurrently -- getContext()'s memoized promise
    // must still resolve to a single underlying fetch, not one per call.
    await Promise.all([
      toolbox.execute("get_scope_overview", {}),
      toolbox.execute("get_balance_runout", {}),
      toolbox.execute("compare_previous_period", {})
    ]);

    expect(loadDashboardSummaryMock).toHaveBeenCalledTimes(1);
    expect(loadDashboardDailyRollupsMock).toHaveBeenCalledTimes(1);
    expect(loadDashboardHourlyRollupsMock).toHaveBeenCalledTimes(1);
  });
});
