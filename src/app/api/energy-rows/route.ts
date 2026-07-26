import { NextResponse } from "next/server";
import { loadEnergyRowsPage } from "@/lib/energy-data";
import { parseDataTableQuery } from "@/lib/data-table-query-params";
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
    const identifier = getRateLimitIdentifier(auth.session.userId, "energy-rows");
    const rateLimit = await enforceRateLimit(identifier);
    const rateHeaders = rateLimitHeaders(rateLimit);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { message: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: rateHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseDataTableQuery(searchParams);

    const result = await loadEnergyRowsPage(auth.session.accessToken, {
      from: parsed.from || undefined,
      to: parsed.to || undefined,
      chargeType: parsed.chargeType,
      search: parsed.search || undefined,
      sortKey: parsed.sortKey,
      sortDirection: parsed.sortDirection,
      page: parsed.page,
      pageSize: parsed.pageSize
    });

    return NextResponse.json(result, { headers: rateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load energy rows.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
