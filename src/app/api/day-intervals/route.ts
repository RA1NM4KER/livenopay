import { NextResponse } from "next/server";
import { loadDayIntervalRollups } from "@/lib/dashboard-data";
import { enforceRateLimit, getRateLimitIdentifier, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const identifier = getRateLimitIdentifier(request, "day-intervals");
    const rateLimit = await enforceRateLimit(identifier);
    const rateHeaders = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodDate = searchParams.get("periodDate")?.trim() ?? "";

    if (!periodDate) {
      return NextResponse.json(
        { message: "Missing periodDate query parameter." },
        { status: 400, headers: rateHeaders }
      );
    }

    const rows = await loadDayIntervalRollups(periodDate);
    return NextResponse.json({ rows }, { headers: rateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load day intervals.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
