import type { Analytics, DailyRollupRow, DashboardSummary, HourlyRollupRow } from "@/lib/types";

export type AssistantConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AssistantScope = {
  from?: string;
  to?: string;
};

// Deliberately narrower than the full UserPermissions row -- the assistant
// toolbox only needs to know which optional capabilities to register.
export type AssistantPermissions = {
  activitiesEnabled: boolean;
};

export type AssistantToolHandler = (
  args: Record<string, unknown>,
  getContext: () => Promise<DashboardContext>
) => Promise<unknown>;

export type ChatToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type AssistantTool = {
  definition: ChatToolDefinition;
  handler: AssistantToolHandler;
};

export type DashboardContext = {
  accessToken: string;
  summary: DashboardSummary;
  dailyRows: DailyRollupRow[];
  hourlyRows: HourlyRollupRow[];
  analytics: Analytics;
  scope: {
    from: string;
    to: string;
  };
};

export type AssistantResponse = {
  answer: string;
  toolsUsed: string[];
  scope: {
    from: string;
    to: string;
  };
};
