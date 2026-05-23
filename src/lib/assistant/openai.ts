import { buildAssistantSystemPrompt } from "./system-prompt";
import type { AssistantConversationMessage, AssistantScope } from "./types";
import { createAssistantToolbox } from "./tools/index";

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
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for assistant access.");
  }

  return { apiKey, model };
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

export async function answerAssistantQuestion(
  question: string,
  scope: AssistantScope,
  history: AssistantConversationMessage[] = []
) {
  const toolbox = createAssistantToolbox(scope);
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildAssistantSystemPrompt(scope)
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

      for (const toolCall of message.tool_calls) {
        const parsedArgs = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        const result = await toolbox.execute(toolCall.function.name, parsedArgs);
        toolsUsed.add(toolCall.function.name);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
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
