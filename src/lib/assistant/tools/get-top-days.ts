import { formatCurrency, formatKwh, formatTariff } from "@/lib/format";
import type { Analytics } from "@/lib/types";
import type { AssistantTool } from "../types";
import { GetTopDaysSchema } from "./schemas";

const topDayMetricLabels = {
  kwh: "usage",
  spend: "spend",
  tariff: "tariff"
} as const;

function summarizeTopDay(metric: "spend" | "kwh" | "tariff", row: Analytics["daily"][number]) {
  return {
    date: row.date,
    spend: row.spend,
    kwh: row.kwh,
    averageTariff: row.averageTariff,
    balance: row.balance,
    metric,
    metricLabel: topDayMetricLabels[metric],
    metricValue: metric === "spend" ? row.spend : metric === "kwh" ? row.kwh : row.averageTariff,
    metricDisplay:
      metric === "spend"
        ? formatCurrency(row.spend)
        : metric === "kwh"
          ? formatKwh(row.kwh)
          : formatTariff(row.averageTariff)
  };
}

export const getTopDaysTool: AssistantTool = {
  definition: {
    type: "function",
    function: {
      name: "get_top_days",
      description: "Get the highest days in the active range by spend, usage, or average tariff.",
      parameters: GetTopDaysSchema
    }
  },
  handler: async (args, getContext) => {
    const context = await getContext();
    const metric = args.metric === "kwh" || args.metric === "tariff" ? args.metric : "spend";
    const requestedLimit = typeof args.limit === "number" ? args.limit : Number(args.limit ?? 5);
    const limit = Math.min(10, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 5));
    const rows = context.analytics.daily
      .slice()
      .sort((left, right) => {
        const leftValue = metric === "spend" ? left.spend : metric === "kwh" ? left.kwh : left.averageTariff;
        const rightValue = metric === "spend" ? right.spend : metric === "kwh" ? right.kwh : right.averageTariff;
        return rightValue - leftValue;
      })
      .slice(0, limit)
      .map((row) => summarizeTopDay(metric, row));

    return {
      scope: context.scope,
      metric,
      rows
    };
  }
};
