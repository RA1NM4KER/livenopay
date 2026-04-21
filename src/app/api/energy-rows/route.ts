import { NextResponse } from "next/server";
import { loadEnergyRowsPage } from "@/lib/energy-data";
import { parseDataTableQuery } from "@/lib/data-table-query-params";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseDataTableQuery(searchParams);

    const result = await loadEnergyRowsPage({
      from: parsed.from || undefined,
      to: parsed.to || undefined,
      chargeType: parsed.chargeType,
      search: parsed.search || undefined,
      sortKey: parsed.sortKey,
      sortDirection: parsed.sortDirection,
      page: parsed.page,
      pageSize: parsed.pageSize
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load energy rows.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
