import { buildAssistantSystemPrompt } from "./system-prompt";
import type { AssistantConversationMessage, AssistantPermissions, AssistantScope } from "./types";
import { createAssistantToolbox } from "./tools/index";
import { getOpenAiApiKey, getOpenAiModel } from "@/lib/env";

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  }>;
};

function openAiConfig() {
  const apiKey = getOpenAiApiKey();

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for assistant access.");
  }

  return { apiKey, model: getOpenAiModel() };
}

async function callChatCompletions(messages: ChatMessage[], tools: ReturnType<typeof createAssistantToolbox>["tools"]) {
  const { apiKey, model } = openAiConfig();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages,
      tools,
      tool_choice: "auto"
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI chat completion failed (${response.status}): ${detail}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}

type ParsedToolArgs = { ok: true; args: Record<string, unknown> } | { ok: false };

// Model-generated function-call arguments are untrusted input: they may be
// malformed JSON, or valid JSON that isn't a plain object (e.g. an array or
// a bare string). Either case must degrade to a structured error the model
// can see and recover from, never an unhandled throw that 500s the request.
function parseToolArguments(rawArguments: string): ParsedToolArgs {
  if (!rawArguments) {
    return { ok: true, args: {} };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments);
  } catch {
    return { ok: false };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false };
  }

  return { ok: true, args: parsed as Record<string, unknown> };
}

type ToolCallOutcome = {
  toolCallId: string;
  toolName: string;
  payload: unknown;
  used: boolean;
};

// Tool calls returned together in one assistant message are independent:
// each handler only reads from the single memoized DashboardContext promise
// (see tools/index.ts's getContext()), none mutate shared state, and none
// depend on another call's result. Promise.all is therefore safe here and
// avoids serializing N round trips to Supabase/OpenAI's own backends purely
// because the model happened to ask for several things at once. Result
// order from Promise.all matches the input array order regardless of which
// call resolves first, so each outcome is still pushed against the correct
// tool_call_id.
async function runToolCall(
  toolbox: ReturnType<typeof createAssistantToolbox>,
  toolCall: { id: string; function: { name: string; arguments: string } }
): Promise<ToolCallOutcome> {
  const toolName = toolCall.function.name;
  const parsed = parseToolArguments(toolCall.function.arguments);

  if (!parsed.ok) {
    return {
      toolCallId: toolCall.id,
      toolName,
      payload: { error: "invalid_tool_arguments", tool: toolName },
      used: false
    };
  }

  try {
    const payload = await toolbox.execute(toolName, parsed.args);
    return { toolCallId: toolCall.id, toolName, payload, used: true };
  } catch (error) {
    const isUnknownTool = error instanceof Error && error.message.startsWith("Unknown assistant tool");
    return {
      toolCallId: toolCall.id,
      toolName,
      payload: { error: isUnknownTool ? "unknown_tool" : "tool_execution_failed", tool: toolName },
      used: false
    };
  }
}

export async function answerAssistantQuestion(
  accessToken: string,
  question: string,
  scope: AssistantScope,
  history: AssistantConversationMessage[] = [],
  permissions: AssistantPermissions = { activitiesEnabled: false }
) {
  const toolbox = createAssistantToolbox(accessToken, scope, permissions);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildAssistantSystemPrompt(scope, permissions)
    },
    ...history.map((message) => ({
      role: message.role,
      content: message.content
    })),
    {
      role: "user",
      content: question.trim()
    }
  ];
  const toolsUsed = new Set<string>();

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const completion = await callChatCompletions(messages, toolbox.tools);
    const message = completion.choices?.[0]?.message;

    if (!message) {
      throw new Error("OpenAI did not return an assistant message.");
    }

    if (message.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls
      });

      const outcomes = await Promise.all(message.tool_calls.map((toolCall) => runToolCall(toolbox, toolCall)));

      for (const outcome of outcomes) {
        if (outcome.used) {
          toolsUsed.add(outcome.toolName);
        }
        messages.push({
          role: "tool",
          tool_call_id: outcome.toolCallId,
          content: JSON.stringify(outcome.payload)
        });
      }

      continue;
    }

    const answer = message.content?.trim();

    if (!answer) {
      throw new Error("OpenAI returned an empty assistant answer.");
    }

    return {
      answer,
      toolsUsed: Array.from(toolsUsed)
    };
  }

  throw new Error("Assistant exceeded the maximum tool-call loop.");
}
