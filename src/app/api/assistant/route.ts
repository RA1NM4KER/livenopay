import type { AssistantConversationMessage } from "@/lib/assistant/types";
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerAssistantQuestion } from "@/lib/assistant/openai";
import { enforceRateLimit, getRateLimitIdentifier, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  question: z.string().trim().min(1, "Question is required."),
  from: z.string().optional(),
  to: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1)
      })
    )
    .max(12)
    .optional()
});

export async function POST(request: Request) {
  try {
    const identifier = getRateLimitIdentifier(request, "assistant");
    const rateLimit = await enforceRateLimit(identifier);
    const rateHeaders = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateHeaders }
      );
    }

    const body = requestSchema.parse(await request.json());
    const result = await answerAssistantQuestion(
      body.question,
      {
        from: body.from,
        to: body.to
      },
      (body.history ?? []) as AssistantConversationMessage[]
    );

    return NextResponse.json(
      {
        answer: result.answer,
        toolsUsed: result.toolsUsed,
        scope: {
          from: body.from ?? "",
          to: body.to ?? ""
        }
      },
      { headers: rateHeaders }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to answer assistant question.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
