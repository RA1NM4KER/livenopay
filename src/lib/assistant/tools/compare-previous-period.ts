import { createAnalytics } from "@/lib/analytics";
import { previousComparableScope } from "@/lib/period-comparison";
import type { AssistantTool } from "../types";
import { EmptySchema } from "./schemas";

export const comparePreviousPeriodTool: AssistantTool = {
  definition: {
    type: "function",
    function: {
      name: "compare_previous_period",
      description: "Compare the active dashboard date range against the immediately preceding range of equal length.",
      parameters: EmptySchema
    }
  },
  handler: async (_args, getContext) => {
    const context = await getContext();
    const current = context.analytics.metrics;
    const previousRange = previousComparableScope(context.scope);
    const previousAnalytics = createAnalytics(
      context.dailyRows,
      context.hourlyRows,
      previousRange.from,
      previousRange.to
    );
    const previous = previousAnalytics.metrics;

    return {
      currentScope: context.scope,
      previousScope: previousRange,
      current,
      previous,
      deltas: {
        spend: current.totalSpend - previous.totalSpend,
        kwh: current.totalKwh - previous.totalKwh,
        waterKl: current.totalWaterKl - previous.totalWaterKl,
        waterSpend: current.totalWaterSpend - previous.totalWaterSpend,
        averageSpendPerDay: current.averageSpendPerDay - previous.averageSpendPerDay,
        averageKwhPerDay: current.averageKwhPerDay - previous.averageKwhPerDay,
        latestBalance:
          typeof current.latestBalance === "number" && typeof previous.latestBalance === "number"
            ? current.latestBalance - previous.latestBalance
            : null
      }
    };
  }
};
