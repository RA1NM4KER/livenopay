import { loadExportRows } from "@/lib/energy-data";
import type { AssistantTool } from "../types";
import { GetRecentTopupsSchema } from "./schemas";

export const getRecentTopupsTool: AssistantTool = {
  definition: {
    type: "function",
    function: {
      name: "get_recent_topups",
      description: "List the latest top-up rows captured within the active dashboard date range.",
      parameters: GetRecentTopupsSchema
    }
  },
  handler: async (args, getContext) => {
    const context = await getContext();
    const requestedLimit = typeof args.limit === "number" ? args.limit : Number(args.limit ?? 10);
    const limit = Math.min(20, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 10));
    const rows = await loadExportRows(context.accessToken, {
      from: context.scope.from,
      to: context.scope.to,
      chargeType: "topup",
      sortKey: "captured",
      sortDirection: "desc"
    });

    return {
      scope: context.scope,
      count: rows.length,
      topups: rows.slice(0, limit).map((row) => ({
        capturedAt: row.captureDateTime,
        period: row.periodDateTime,
        amount: row.cost,
        balanceAfter: row.balance
      }))
    };
  }
};
