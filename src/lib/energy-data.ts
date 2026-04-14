import { toEnergyRow, type EnergyRecordInput } from "./csv";
import type { EnergyRow, SyncMetadata } from "./types";

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

  return response.json() as Promise<T>;
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
