import { loadDayIntervalRollups } from "@/lib/dashboard-data";
import type { AssistantTool } from "../types";
import { ExplainDaySchema } from "./schemas";

export const explainDayTool: AssistantTool = {
  definition: {
    type: "function",
    function: {
      name: "explain_day",
      description: "Explain one specific day using its daily rollup and top half-hour intervals.",
      parameters: ExplainDaySchema
    }
  },
  handler: async (args, getContext) => {
    const context = await getContext();
    const date = typeof args.date === "string" && args.date ? args.date : context.scope.to;
    const day = context.dailyRows.find((row) => row.periodDate === date);

    if (!day) {
      return {
        scope: context.scope,
        date,
        found: false
      };
    }

    const intervals = await loadDayIntervalRollups(date);
    const topSpendIntervals = intervals
      .slice()
      .sort((left, right) => right.spend - left.spend)
      .slice(0, 6)
      .map((interval) => ({
        time: interval.periodTime,
        spend: interval.spend,
        kwh: interval.kwh
      }));
    const topUsageIntervals = intervals
      .slice()
      .sort((left, right) => right.kwh - left.kwh)
      .slice(0, 6)
      .map((interval) => ({
        time: interval.periodTime,
        spend: interval.spend,
        kwh: interval.kwh
      }));

    return {
      scope: context.scope,
      date,
      found: true,
      day,
      topSpendIntervals,
      topUsageIntervals
    };
  }
};
