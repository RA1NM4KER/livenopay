import "server-only";

import {
  currentLivenopayLocalYear,
  dedupeLivenopayRows,
  fetchLivenopayLedgerRows,
  getLivenopayCsvPath,
  livenopayLedgerKey,
  latestLivenopayCsvStartDate,
  type LivenopayCsvRow,
  readLivenopayCsvRows,
  writeLivenopayCsv
} from "./livenopay-web";

const BATCH_SIZE = 500;

type SyncMode = "incremental" | "full";

type CaptureRunRecord = {
  id: string;
};

type ExistingSupabaseRow = {
  balance: string | number;
  capture_dt: string;
  charge_label: string;
  cost: string | number;
  kwh: string | number;
  water_kl?: string | number;
  period_dt: string;
  source_ts?: string | null;
  tariff: string | number;
};

type SupabaseEnergyRow = {
  capture_dt: string;
  charge_label: string;
  period_dt: string;
  kwh: string;
  water_kl: string;
  tariff: string;
  cost: string;
  balance: string;
  source_ts?: string;
  sync_run_id: string;
  last_seen_at: string;
};

function nowIso() {
  return new Date().toISOString();
}

function supabaseSyncConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase sync credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment."
    );
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`
  };
}

async function requestSupabaseJson<T>(
  method: "GET" | "POST" | "PATCH",
  routePath: string,
  body?: unknown,
  prefer?: string
): Promise<T> {
  const { key, restUrl } = supabaseSyncConfig();
  const response = await fetch(`${restUrl}${routePath}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${method} ${routePath} failed with ${response.status}: ${text}`);
  }

  return (text ? JSON.parse(text) : null) as T;
}

function toCsvRow(row: ExistingSupabaseRow): LivenopayCsvRow {
  return {
    capture_dt: row.capture_dt,
    source_ts: row.source_ts || "",
    charge_label: row.charge_label,
    period_dt: row.period_dt,
    kwh: String(row.kwh ?? "0"),
    water_kl: String(row.water_kl ?? "0"),
    tariff: String(row.tariff ?? "0"),
    cost: String(row.cost ?? "0"),
    balance: String(row.balance ?? "0")
  };
}

async function fetchSupabaseRows(basePath: string, baseParams: URLSearchParams) {
  const rows: ExistingSupabaseRow[] = [];

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const params = new URLSearchParams(baseParams);
    params.set("limit", String(BATCH_SIZE));
    params.set("offset", String(offset));
    const page = await requestSupabaseJson<ExistingSupabaseRow[]>("GET", `${basePath}?${params.toString()}`);

    rows.push(...page);

    if (page.length < BATCH_SIZE) {
      break;
    }
  }

  return rows;
}

async function loadExistingRowsBefore(cutoff: string) {
  const params = new URLSearchParams({
    select: "capture_dt,source_ts,charge_label,period_dt,kwh,water_kl,tariff,cost,balance",
    order: "period_ts.asc,capture_ts.asc"
  });
  params.append("period_dt", `lt.${cutoff}`);

  const rows = await fetchSupabaseRows("/energy_rows", params);
  return rows.map(toCsvRow);
}

async function latestSupabaseStartDate() {
  const params = new URLSearchParams({
    select: "period_dt",
    order: "period_dt.desc",
    limit: "1"
  });
  const rows = await requestSupabaseJson<Array<{ period_dt: string }>>("GET", `/energy_rows?${params.toString()}`);
  return rows[0]?.period_dt?.split(" ", 1)[0] || null;
}

async function startCaptureRun(mode: string) {
  const response = await requestSupabaseJson<CaptureRunRecord[]>(
    "POST",
    "/capture_runs",
    [{ mode, status: "running" }],
    "return=representation"
  );

  return response[0]?.id;
}

async function finishCaptureRun(
  runId: string,
  status: "success" | "failed",
  options: {
    rowsInCsv?: number;
    rowsSynced?: number;
    error?: string;
  } = {}
) {
  await requestSupabaseJson(
    "PATCH",
    `/capture_runs?id=eq.${encodeURIComponent(runId)}`,
    {
      finished_at: nowIso(),
      status,
      rows_in_csv: options.rowsInCsv,
      rows_synced: options.rowsSynced,
      error: options.error
    },
    "return=minimal"
  );
}

async function runWebCapture(full: boolean) {
  let startDate = process.env.LIVENOPAY_WEB_START_DATE;

  if (!startDate) {
    if (full) {
      startDate = "2000-01-01";
    } else {
      startDate =
        (await latestLivenopayCsvStartDate()) ||
        (await latestSupabaseStartDate()) ||
        `${currentLivenopayLocalYear()}-01-01`;
    }
  }

  const fetchedRows = await fetchLivenopayLedgerRows(startDate);
  let rows: LivenopayCsvRow[];

  if (full) {
    rows = fetchedRows;
  } else {
    const cutoff = `${startDate} 00:00`;
    const retainedRows = await loadExistingRowsBefore(cutoff);
    rows = dedupeLivenopayRows([...retainedRows, ...fetchedRows]);
  }

  await writeLivenopayCsv(rows);
  return {
    csvPath: getLivenopayCsvPath(),
    fetchedRows: fetchedRows.length,
    rows
  };
}

async function upsertRows(rows: LivenopayCsvRow[], runId: string) {
  const syncedAt = nowIso();
  const onConflict = encodeURIComponent("charge_label,period_dt,cost,balance");
  let total = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batchRows = dedupeLivenopayRows(rows.slice(index, index + BATCH_SIZE));
    const batchSeen = new Set<string>();
    const batch: SupabaseEnergyRow[] = batchRows.flatMap((row) => {
      const key = livenopayLedgerKey(row);
      if (batchSeen.has(key)) {
        return [];
      }

      batchSeen.add(key);
      const sourceTs = row.source_ts.trim();
      return [
        {
          capture_dt: row.capture_dt,
          charge_label: row.charge_label,
          period_dt: row.period_dt,
          kwh: row.kwh,
          water_kl: row.water_kl,
          tariff: row.tariff,
          cost: row.cost,
          balance: row.balance,
          ...(sourceTs ? { source_ts: sourceTs } : {}),
          sync_run_id: runId,
          last_seen_at: syncedAt
        }
      ];
    });

    if (!batch.length) {
      continue;
    }

    await requestSupabaseJson(
      "POST",
      `/energy_rows?on_conflict=${onConflict}`,
      batch,
      "resolution=merge-duplicates,return=minimal"
    );

    total += batch.length;
  }

  return total;
}

export async function runLivenopayWebSync(mode: SyncMode) {
  supabaseSyncConfig();

  const runId = await startCaptureRun(mode === "full" ? "web-full" : "web");
  if (!runId) {
    throw new Error("Failed to create capture run.");
  }

  try {
    const capture = await runWebCapture(mode === "full");
    const rows = await readLivenopayCsvRows();
    const synced = await upsertRows(rows, runId);

    await finishCaptureRun(runId, "success", {
      rowsInCsv: rows.length,
      rowsSynced: synced
    });

    return {
      mode,
      output: `Fetched ${capture.fetchedRows} rows from LiveMopay web API. Wrote ${capture.rows.length} rows to ${capture.csvPath}. Synced ${synced} rows to Supabase.`,
      rowsInCsv: rows.length,
      rowsSynced: synced
    };
  } catch (error) {
    await finishCaptureRun(runId, "failed", {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
