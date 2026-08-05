import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AssistantTool } from "./types";
import { answerAssistantQuestion } from "./openai";

const { getOpenAiApiKeyMock, getOpenAiModelMock } = vi.hoisted(() => ({
  getOpenAiApiKeyMock: vi.fn(() => "test-key"),
  getOpenAiModelMock: vi.fn(() => "gpt-test")
}));

vi.mock("@/lib/env", () => ({
  getOpenAiApiKey: getOpenAiApiKeyMock,
  getOpenAiModel: getOpenAiModelMock
}));

const { createAssistantToolboxMock, executeMock } = vi.hoisted(() => ({
  createAssistantToolboxMock: vi.fn(),
  executeMock: vi.fn()
}));

vi.mock("./tools/index", () => ({
  createAssistantToolbox: createAssistantToolboxMock
}));

const fakeToolDefinitions: AssistantTool["definition"][] = [
  {
    type: "function",
    function: { name: "tool_a", description: "Tool A", parameters: { type: "object", properties: {} } }
  },
  {
    type: "function",
    function: { name: "tool_b", description: "Tool B", parameters: { type: "object", properties: {} } }
  }
];

function completion(body: {
  content?: string | null;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
}) {
  return {
    choices: [
      {
        message: {
          content: body.content ?? null,
          tool_calls: body.toolCalls?.map((call) => ({
            id: call.id,
            type: "function" as const,
            function: { name: call.name, arguments: call.arguments }
          }))
        }
      }
    ]
  };
}

function queueCompletions(...bodies: ReturnType<typeof completion>[]) {
  const fetchMock = vi.fn();
  for (const body of bodies) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => body
    });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function sentMessages(fetchMock: ReturnType<typeof vi.fn>, callIndex: number) {
  const [, init] = fetchMock.mock.calls[callIndex];
  return JSON.parse((init as RequestInit).body as string).messages as Array<{
    role: string;
    tool_call_id?: string;
    content: string | null;
  }>;
}

describe("answerAssistantQuestion", () => {
  beforeEach(() => {
    createAssistantToolboxMock.mockReset();
    executeMock.mockReset();
    createAssistantToolboxMock.mockReturnValue({ tools: fakeToolDefinitions, execute: executeMock });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the final answer directly when the model makes no tool calls", async () => {
    queueCompletions(completion({ content: "The answer is 42." }));
    const result = await answerAssistantQuestion("token", "What is the answer?", {});

    expect(result.answer).toBe("The answer is 42.");
    expect(result.toolsUsed).toEqual([]);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("passes permissions through to createAssistantToolbox", async () => {
    queueCompletions(completion({ content: "ok" }));
    await answerAssistantQuestion("token", "Q", {}, [], { activitiesEnabled: true });

    expect(createAssistantToolboxMock).toHaveBeenCalledWith("token", {}, { activitiesEnabled: true });
  });

  it("executes multiple tool calls from one message and maps each result back to its own tool_call_id, in order", async () => {
    const fetchMock = queueCompletions(
      completion({
        toolCalls: [
          { id: "call-a", name: "tool_a", arguments: "{}" },
          { id: "call-b", name: "tool_b", arguments: '{"x":1}' }
        ]
      }),
      completion({ content: "Combined answer." })
    );
    executeMock.mockImplementation(async (name: string) => ({ from: name }));
    const result = await answerAssistantQuestion("token", "Q", {});

    expect(result.answer).toBe("Combined answer.");
    expect(result.toolsUsed.sort()).toEqual(["tool_a", "tool_b"]);
    expect(executeMock).toHaveBeenCalledWith("tool_a", {});
    expect(executeMock).toHaveBeenCalledWith("tool_b", { x: 1 });

    const messages = await sentMessages(fetchMock, 1);
    const toolMessages = messages.filter((message) => message.role === "tool");
    expect(toolMessages).toHaveLength(2);
    expect(toolMessages[0]).toMatchObject({ tool_call_id: "call-a", content: JSON.stringify({ from: "tool_a" }) });
    expect(toolMessages[1]).toMatchObject({ tool_call_id: "call-b", content: JSON.stringify({ from: "tool_b" }) });
  });

  it("returns a structured error and skips execution for malformed tool arguments, instead of throwing", async () => {
    const fetchMock = queueCompletions(
      completion({ toolCalls: [{ id: "call-a", name: "tool_a", arguments: "{not valid json" }] }),
      completion({ content: "Recovered." })
    );
    const result = await answerAssistantQuestion("token", "Q", {});

    expect(result.answer).toBe("Recovered.");
    expect(result.toolsUsed).toEqual([]);
    expect(executeMock).not.toHaveBeenCalled();

    const messages = await sentMessages(fetchMock, 1);
    const toolMessage = messages.find((message) => message.role === "tool");
    expect(JSON.parse(toolMessage!.content!)).toEqual({ error: "invalid_tool_arguments", tool: "tool_a" });
  });

  it("returns a structured error for tool arguments that parse to a non-object (e.g. an array)", async () => {
    queueCompletions(
      completion({ toolCalls: [{ id: "call-a", name: "tool_a", arguments: "[1,2,3]" }] }),
      completion({ content: "Recovered." })
    );
    await answerAssistantQuestion("token", "Q", {});
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns a structured unknown_tool error, without leaking internal error details, when the tool name isn't registered", async () => {
    const fetchMock = queueCompletions(
      completion({ toolCalls: [{ id: "call-a", name: "bogus_tool", arguments: "{}" }] }),
      completion({ content: "Recovered." })
    );
    executeMock.mockRejectedValueOnce(new Error("Unknown assistant tool: bogus_tool"));
    const result = await answerAssistantQuestion("token", "Q", {});

    expect(result.toolsUsed).toEqual([]);
    const messages = await sentMessages(fetchMock, 1);
    const toolMessage = messages.find((message) => message.role === "tool");
    expect(JSON.parse(toolMessage!.content!)).toEqual({ error: "unknown_tool", tool: "bogus_tool" });
  });

  it("returns a structured tool_execution_failed error, without leaking the underlying message, when a handler throws", async () => {
    const fetchMock = queueCompletions(
      completion({ toolCalls: [{ id: "call-a", name: "tool_a", arguments: "{}" }] }),
      completion({ content: "Recovered." })
    );
    executeMock.mockRejectedValueOnce(new Error("Supabase connection refused at 10.0.0.5"));
    await answerAssistantQuestion("token", "Q", {});

    const messages = await sentMessages(fetchMock, 1);
    const toolMessage = messages.find((message) => message.role === "tool");
    const payload = JSON.parse(toolMessage!.content!);
    expect(payload).toEqual({ error: "tool_execution_failed", tool: "tool_a" });
    expect(toolMessage!.content).not.toContain("10.0.0.5");
  });

  it("excludes failed tool calls from toolsUsed while still including successful ones in the same turn", async () => {
    queueCompletions(
      completion({
        toolCalls: [
          { id: "call-a", name: "tool_a", arguments: "{}" },
          { id: "call-b", name: "tool_b", arguments: "not json" }
        ]
      }),
      completion({ content: "done" })
    );
    executeMock.mockResolvedValueOnce({ ok: true });
    const result = await answerAssistantQuestion("token", "Q", {});
    expect(result.toolsUsed).toEqual(["tool_a"]);
  });

  it("throws once the six-iteration tool-call loop is exceeded", async () => {
    const bodies = Array.from({ length: 6 }, (_, index) =>
      completion({ toolCalls: [{ id: `call-${index}`, name: "tool_a", arguments: "{}" }] })
    );
    queueCompletions(...bodies);
    executeMock.mockResolvedValue({ ok: true });
    await expect(answerAssistantQuestion("token", "Q", {})).rejects.toThrow(
      "Assistant exceeded the maximum tool-call loop."
    );
  });

  it("throws when OpenAI returns an empty final answer", async () => {
    queueCompletions(completion({ content: "   " }));
    await expect(answerAssistantQuestion("token", "Q", {})).rejects.toThrow(
      "OpenAI returned an empty assistant answer."
    );
  });
});
