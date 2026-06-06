import { toEnergyRow, type EnergyRecordInput } from "./csv";
import { supabaseFetch, supabaseFetchAllPages, supabaseResponse } from "./supabase-rest";
import type { EnergyRow, SyncMetadata } from "./types";
import type { SortDirection, SortKey } from "@/components/data/types";

type SupabaseCaptureRun = {
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_in_csv: number | null;
  rows_synced: number | null;
};
export type ChargeTypeFilter = "all" | EnergyRow["chargeKind"];

export type EnergyRowsPageQuery = {
  from?: string;
  to?: string;
  chargeType?: ChargeTypeFilter;
  search?: string;
  sortKey?: SortKey;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
};

export type EnergyRowsPage = {
  rows: EnergyRow[];
  total: number;
  page: number;
  pageSize: number;
  sync: SyncMetadata;
  bounds: {
    from: string;
    to: string;
  };
};

const sortColumnByKey: Record<SortKey, string> = {
  period: "period_ts",
  type: "charge_label",
  band: "charge_label",
  kwh: "usage_qty",
  tariff: "tariff",
  amount: "cost",
  balance: "balance",
  captured: "capture_ts"
};

function contentRangeTotal(contentRange: string | null) {
  if (!contentRange) {
    return 0;
  }

  const totalPart = contentRange.split("/")[1];
  const parsed = Number(totalPart);
  return Number.isFinite(parsed) ? parsed : 0;
}

function searchFilterOrClause(value: string) {
  const escaped = value.replace(/\*/g, "").trim();

  if (!escaped) {
    return "";
  }

  return `charge_label.ilike.*${escaped}*,period_dt.ilike.*${escaped}*,capture_dt.ilike.*${escaped}*`;
}

function orderClauseForQuery(sortKey?: SortKey, sortDirection?: SortDirection) {
  const resolvedSortKey = sortKey ?? "captured";
  const mappedSortColumn = sortColumnByKey[resolvedSortKey];
  const mappedSortDirection = sortDirection === "asc" ? "asc" : "desc";

  if (resolvedSortKey === "captured") {
    return `source_ts.${mappedSortDirection}.nullslast,${mappedSortColumn}.${mappedSortDirection},period_ts.${mappedSortDirection}`;
  }

  if (resolvedSortKey === "period") {
    return `${mappedSortColumn}.${mappedSortDirection},source_ts.desc.nullslast,capture_ts.desc`;
  }

  return `${mappedSortColumn}.${mappedSortDirection},source_ts.desc.nullslast,capture_ts.desc,period_ts.desc`;
}

function queryPathForPage({ from, to, chargeType, search, sortKey, sortDirection }: EnergyRowsPageQuery) {
  const params = new URLSearchParams();
  params.set("select", "capture_dt,charge_label,period_dt,kwh,water_kl,tariff,cost,balance");
  params.set("order", orderClauseForQuery(sortKey, sortDirection));

  if (from) {
    params.append("period_dt", `gte.${from} 00:00:00`);
  }

  if (to) {
    params.append("period_dt", `lte.${to} 23:59:59`);
  }

  if (chargeType === "energy") {
    params.set("charge_label", "like.Energy Charge:*");
  } else if (chargeType === "water") {
    params.set("charge_label", "like.Water:*");
  } else if (chargeType === "topup") {
    params.set("charge_label", "eq.Top Up");
  } else if (chargeType === "fixed") {
    params.append("charge_label", "not.like.Energy Charge:*");
    params.append("charge_label", "not.like.Water:*");
    params.append("charge_label", "neq.Top Up");
  }

  const searchClause = searchFilterOrClause(search ?? "");

  if (searchClause) {
    params.set("or", `(${searchClause})`);
  }

  return `/energy_rows?${params.toString()}`;
}

async function loadEnergyDateBounds() {
  const [earliest, latest] = await Promise.all([
    supabaseFetch<Array<{ period_dt: string }>>("/energy_rows?select=period_dt&order=period_dt.asc&limit=1"),
    supabaseFetch<Array<{ period_dt: string }>>("/energy_rows?select=period_dt&order=period_dt.desc&limit=1")
  ]);

  const from = earliest[0]?.period_dt?.slice(0, 10) ?? "";
  const to = latest[0]?.period_dt?.slice(0, 10) ?? "";

  return { from, to };
}

export async function loadEnergyRowsPage(query: EnergyRowsPageQuery): Promise<EnergyRowsPage> {
  const pageSize = Math.min(100, Math.max(25, query.pageSize ?? 50));
  const page = Math.max(1, query.page ?? 1);
  const offset = (page - 1) * pageSize;
  const path = queryPathForPage(query);

  const [response, bounds, sync] = await Promise.all([
    supabaseResponse(path, {
      headers: {
        Prefer: "count=exact",
        Range: `${offset}-${offset + pageSize - 1}`
      }
    }),
    loadEnergyDateBounds(),
    loadSyncMetadata()
  ]);

  const pageRows = (await response.json()) as EnergyRecordInput[];
  return {
    rows: pageRows.map(toEnergyRow),
    total: contentRangeTotal(response.headers.get("content-range")),
    page,
    pageSize,
    sync,
    bounds
  };
}
async function loadSyncMetadata(): Promise<SyncMetadata> {
  const runs = await supabaseFetch<SupabaseCaptureRun[]>(
    "/capture_runs?select=started_at,finished_at,status,rows_in_csv,rows_synced&status=eq.success&order=finished_at.desc&limit=1"
  );
  const latest = runs[0];

  return {
    lastSyncedAt: latest?.finished_at ?? undefined,
    rowsInCsv: latest?.rows_in_csv ?? undefined,
    rowsSynced: latest?.rows_synced ?? undefined
  };
}

export async function loadExportRows(query: Omit<EnergyRowsPageQuery, "page" | "pageSize">): Promise<EnergyRow[]> {
  const basePath = queryPathForPage(query);
  const rows = await supabaseFetchAllPages<EnergyRecordInput>(basePath);

  return rows.map(toEnergyRow);
}
