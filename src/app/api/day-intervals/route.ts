import { NextResponse } from "next/server";
import { loadDayIntervalRollups } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodDate = searchParams.get("periodDate")?.trim() ?? "";

    if (!periodDate) {
      return NextResponse.json({ message: "Missing periodDate query parameter." }, { status: 400 });
    }

    const rows = await loadDayIntervalRollups(periodDate);
    return NextResponse.json({ rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load day intervals.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
