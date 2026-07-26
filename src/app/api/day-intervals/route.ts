import { NextResponse } from "next/server";
import { loadDayIntervalRollups } from "@/lib/dashboard-data";
import { requireConnectedSession } from "@/lib/auth/session";
import { enforceRateLimit, getRateLimitIdentifier, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireConnectedSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.status === 401 ? "Authentication required." : "Connect a LiveMopay account first." },
      { status: auth.status }
    );
  }

  try {
    const identifier = getRateLimitIdentifier(auth.session.userId, "day-intervals");
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

    const rows = await loadDayIntervalRollups(auth.session.accessToken, periodDate);
    return NextResponse.json({ rows }, { headers: rateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load day intervals.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
