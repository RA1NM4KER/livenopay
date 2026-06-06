import { createAnalytics } from "@/lib/analytics";
import type { AssistantTool } from "../types";
import { EmptySchema } from "./schemas";

function isoDateOffset(date: string, offsetDays: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function inclusiveDayCount(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function previousScope(scope: { from: string; to: string }) {
  const days = inclusiveDayCount(scope.from, scope.to);
  return {
    from: isoDateOffset(scope.from, -days),
    to: isoDateOffset(scope.from, -1)
  };
}

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
    const previousRange = previousScope(context.scope);
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
