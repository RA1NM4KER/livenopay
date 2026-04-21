import { toEnergyRow, type EnergyRecordInput } from "./csv";
import type { EnergyRow, SyncMetadata } from "./types";
import type { SortDirection, SortKey } from "@/components/data/types";

const PAGE_SIZE = 1000;

type SupabaseCaptureRun = {
  started_at: string;
  finished_at: string | null;
  status: string;
  rows_in_csv: number | null;
  rows_synced: number | null;
};

type EnergyData = {
  rows: EnergyRow[];
  sync: SyncMetadata;
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
  bounds: {
    from: string;
    to: string;
  };
};

const sortColumnByKey: Record<SortKey, string> = {
  period: "period_dt",
  type: "charge_label",
  band: "charge_label",
  kwh: "kwh",
  tariff: "tariff",
  amount: "cost",
  balance: "balance",
  captured: "capture_dt"
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_ANON_KEY for dashboard data access.");
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`
  };
}

async function supabaseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await supabaseResponse(path, init);
  return response.json() as Promise<T>;
}

async function supabaseResponse(path: string, init?: RequestInit) {
  const { key, restUrl } = supabaseConfig();
  const response = await fetch(`${restUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  return response;
}

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

function queryPathForPage({ from, to, chargeType, search, sortKey, sortDirection }: EnergyRowsPageQuery) {
  const params = new URLSearchParams();
  params.set("select", "capture_dt,charge_label,period_dt,kwh,tariff,cost,balance");

  const mappedSortColumn = sortColumnByKey[sortKey ?? "captured"];
  const mappedSortDirection = sortDirection === "asc" ? "asc" : "desc";
  params.set("order", `${mappedSortColumn}.${mappedSortDirection},period_dt.asc,capture_dt.asc`);

  if (from) {
    params.append("period_dt", `gte.${from} 00:00:00`);
  }

  if (to) {
    params.append("period_dt", `lte.${to} 23:59:59`);
  }

  if (chargeType === "energy") {
    params.set("charge_label", "like.Energy Charge:*");
  } else if (chargeType === "topup") {
    params.set("charge_label", "eq.Top Up");
  } else if (chargeType === "fixed") {
    params.append("charge_label", "not.like.Energy Charge:*");
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

  const [response, bounds] = await Promise.all([
    supabaseResponse(path, {
      headers: {
        Prefer: "count=exact",
        Range: `${offset}-${offset + pageSize - 1}`
      }
    }),
    loadEnergyDateBounds()
  ]);

  const pageRows = (await response.json()) as EnergyRecordInput[];
  return {
    rows: pageRows.map(toEnergyRow),
    total: contentRangeTotal(response.headers.get("content-range")),
    page,
    pageSize,
    bounds
  };
}

async function loadRowsFromSupabase() {
  const rows: EnergyRecordInput[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await supabaseFetch<EnergyRecordInput[]>(
      `/energy_rows?select=capture_dt,charge_label,period_dt,kwh,tariff,cost,balance&order=period_dt.asc,capture_dt.asc`,
      {
        headers: {
          Range: `${offset}-${offset + PAGE_SIZE - 1}`
        }
      }
    );

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows.map(toEnergyRow).sort((left, right) => left.periodTimestamp - right.periodTimestamp);
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

export async function loadEnergyData(): Promise<EnergyData> {
  const [rows, sync] = await Promise.all([loadRowsFromSupabase(), loadSyncMetadata()]);

  return {
    rows,
    sync
  };
}
