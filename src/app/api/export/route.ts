import { loadExportRows } from "@/lib/energy-data";
import { toCSVString, toXLSXBuffer } from "@/lib/export";
import type { EnergyRowsPageQuery } from "@/lib/energy-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";

    const query: Omit<EnergyRowsPageQuery, "page" | "pageSize"> = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      chargeType: (searchParams.get("chargeType") as EnergyRowsPageQuery["chargeType"]) ?? undefined,
      search: searchParams.get("search") ?? undefined,
      sortKey: (searchParams.get("sort") as EnergyRowsPageQuery["sortKey"]) ?? undefined,
      sortDirection: (searchParams.get("dir") as EnergyRowsPageQuery["sortDirection"]) ?? undefined
    };

    const rows = await loadExportRows(query);
    const from = query.from ?? "all";
    const to = query.to ?? "time";
    const filename = `electricity-ledger-${from}-${to}`;

    if (format === "xlsx") {
      const buffer = toXLSXBuffer(rows);
      return new Response(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`
        }
      });
    }

    const csv = toCSVString(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv;charset=utf-8;",
        "Content-Disposition": `attachment; filename="${filename}.csv"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
