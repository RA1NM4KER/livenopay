import "server-only";

import { adminSupabaseFetch, adminSupabaseRequest } from "./supabase-rest";
import {
  currentLivenopayLocalYear,
  dedupeLivenopayRows,
  fetchLiveMopayLedger,
  livenopayLedgerKey,
  refreshLiveMopaySession,
  type LivenopayCsvRow
} from "./livenopay-web";

const BATCH_SIZE = 500;

type SyncMode = "incremental" | "full";

export class SyncAlreadyRunningError extends Error {
  constructor() {
    super("A sync is already running for this connection.");
    this.name = "SyncAlreadyRunningError";
  }
}

type CaptureRunRow = { id: string };

export type LivemopaySyncParams = {
  connectionId: string;
  accountId: string;
  companyId: string;
  propertyId: string;
  refreshToken: string;
  mode: SyncMode;
  onRefreshTokenRotated: (newRefreshToken: string) => Promise<void>;
};

function nowIso() {
  return new Date().toISOString();
}

async function latestPeriodDateForConnection(connectionId: string) {
  const rows = await adminSupabaseFetch<Array<{ period_dt: string }>>(
    `/energy_rows?select=period_dt&connection_id=eq.${encodeURIComponent(connectionId)}&order=period_dt.desc&limit=1`
  );

  return rows[0]?.period_dt?.split(" ", 1)[0] || null;
}

async function startCaptureRun(connectionId: string, mode: SyncMode) {
  try {
    const response = await adminSupabaseRequest<CaptureRunRow[]>(
      "POST",
      "/capture_runs",
      [{ connection_id: connectionId, mode, status: "running" }],
      "return=representation"
    );

    return response[0]?.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // capture_runs_one_running_per_connection is a partial unique index on
    // (connection_id) where status = 'running' -- this is the DB-level
    // concurrency guard replacing the old in-memory `activeSync` variable.
    if (message.includes("23505") || message.includes("duplicate key")) {
      throw new SyncAlreadyRunningError();
    }

    throw error;
  }
}

async function finishCaptureRun(
  runId: string,
  status: "success" | "failed",
  options: { rowsSynced?: number; error?: string } = {}
) {
  await adminSupabaseRequest(
    "PATCH",
    `/capture_runs?id=eq.${encodeURIComponent(runId)}`,
    {
      finished_at: nowIso(),
      status,
      rows_synced: options.rowsSynced,
      error: options.error
    },
    "return=minimal"
  );
}

async function upsertRows(connectionId: string, rows: LivenopayCsvRow[], runId: string) {
  const syncedAt = nowIso();
  const onConflict = encodeURIComponent("connection_id,charge_label,period_dt,cost,balance");
  let total = 0;

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batchRows = dedupeLivenopayRows(rows.slice(index, index + BATCH_SIZE));
    const batchSeen = new Set<string>();
    const batch = batchRows.flatMap((row) => {
      const key = livenopayLedgerKey(row);
      if (batchSeen.has(key)) {
        return [];
      }

      batchSeen.add(key);
      const sourceTs = row.source_ts.trim();

      return [
        {
          connection_id: connectionId,
          capture_dt: row.capture_dt,
          charge_label: row.charge_label,
          period_dt: row.period_dt,
          kwh: row.kwh,
          water_kl: row.water_kl,
          tariff: row.tariff,
          cost: row.cost,
          balance: row.balance,
          source_ts: sourceTs || null,
          sync_run_id: runId,
          last_seen_at: syncedAt
        }
      ];
    });

    if (!batch.length) {
      continue;
    }

    await adminSupabaseRequest(
      "POST",
      `/energy_rows?on_conflict=${onConflict}`,
      batch,
      "resolution=merge-duplicates,return=minimal"
    );

    total += batch.length;
  }

  return total;
}

// No CSV intermediate: ledger rows go straight from LiveMopay into Supabase.
// Id tokens are never persisted, so every sync starts by refreshing the
// LiveMopay session from the connection's stored (encrypted) refresh token.
export async function runLivemopaySync(params: LivemopaySyncParams) {
  const runId = await startCaptureRun(params.connectionId, params.mode);
  if (!runId) {
    throw new Error("Failed to create capture run.");
  }

  try {
    const session = await refreshLiveMopaySession(params.refreshToken);

    if (session.refreshToken !== params.refreshToken) {
      await params.onRefreshTokenRotated(session.refreshToken);
    }

    const startDate =
      params.mode === "full"
        ? "2000-01-01"
        : (await latestPeriodDateForConnection(params.connectionId)) || `${currentLivenopayLocalYear()}-01-01`;

    const rows = await fetchLiveMopayLedger({
      idToken: session.idToken,
      accountId: params.accountId,
      companyId: params.companyId,
      propertyId: params.propertyId,
      startDate
    });

    const synced = await upsertRows(params.connectionId, rows, runId);
    await finishCaptureRun(runId, "success", { rowsSynced: synced });

    return {
      mode: params.mode,
      output: `Fetched ${rows.length} rows from LiveMopay. Synced ${synced} rows to Supabase.`,
      rowsSynced: synced
    };
  } catch (error) {
    await finishCaptureRun(runId, "failed", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
