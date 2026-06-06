import { createAnalytics } from "@/lib/analytics";
import { loadDashboardDailyRollups, loadDashboardHourlyRollups, loadDashboardSummary } from "@/lib/dashboard-data";
import type { DashboardSummary } from "@/lib/types";
import type { AssistantScope, AssistantToolHandler, DashboardContext } from "../types";
import { compareCalendarMonthsTool } from "./compare-calendar-months";
import { comparePreviousPeriodTool } from "./compare-previous-period";
import { explainDayTool } from "./explain-day";
import { getBalanceRunoutTool } from "./get-balance-runout";
import { getRecentTopupsTool } from "./get-recent-topups";
import { getScopeOverviewTool } from "./get-scope-overview";
import { getWaterOverviewTool } from "./get-water-overview";
import { getTopDaysTool } from "./get-top-days";
import { getTopHoursTool } from "./get-top-hours";

function pickScope(summary: DashboardSummary, scope: AssistantScope) {
  return {
    from: scope.from || summary.dateStart || "",
    to: scope.to || summary.dateEnd || ""
  };
}

export function createAssistantToolbox(scope: AssistantScope) {
  let contextPromise: Promise<DashboardContext> | null = null;

  async function getContext() {
    if (!contextPromise) {
      contextPromise = (async () => {
        const [summary, dailyRows, hourlyRows] = await Promise.all([
          loadDashboardSummary(),
          loadDashboardDailyRollups(),
          loadDashboardHourlyRollups()
        ]);
        const resolvedScope = pickScope(summary, scope);
        const analytics = createAnalytics(dailyRows, hourlyRows, resolvedScope.from, resolvedScope.to);

        return {
          summary,
          dailyRows,
          hourlyRows,
          analytics,
          scope: resolvedScope
        };
      })();
    }

    return contextPromise;
  }

  const toolSet = [
    getScopeOverviewTool,
    getBalanceRunoutTool,
    comparePreviousPeriodTool,
    compareCalendarMonthsTool,
    getTopDaysTool,
    getTopHoursTool,
    explainDayTool,
    getRecentTopupsTool,
    getWaterOverviewTool
  ];

  const toolHandlers = Object.fromEntries(
    toolSet.map((tool) => [tool.definition.function.name, tool.handler])
  ) as Record<string, AssistantToolHandler>;

  const tools = toolSet.map((tool) => tool.definition);

  return {
    tools,
    async execute(name: string, args: Record<string, unknown>) {
      const handler = toolHandlers[name];

      if (!handler) {
        throw new Error(`Unknown assistant tool: ${name}`);
      }

      return handler(args, getContext);
    }
  };
}
