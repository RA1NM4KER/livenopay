import type { DashboardSummary, DailyRollupRow, HourlyRollupRow, IntervalRollupRow } from "./types";

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

async function supabaseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await supabaseResponse(path, init);
  return response.json() as Promise<T>;
}

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export async function loadDashboardSummary(): Promise<DashboardSummary> {
  const rows = await supabaseFetch<
    Array<{
      date_start: string | null;
      date_end: string | null;
      latest_balance: number | string | null;
      latest_period: string | null;
      last_synced_at: string | null;
      rows_in_csv: number | null;
      rows_synced: number | null;
      max_interval_spend: number | string | null;
      max_interval_kwh: number | string | null;
    }>
  >(
    "/dashboard_summary?select=date_start,date_end,latest_balance,latest_period,last_synced_at,rows_in_csv,rows_synced,max_interval_spend,max_interval_kwh&id=eq.1&limit=1"
  );

  const row = rows[0];

  return {
    dateStart: row?.date_start ?? undefined,
    dateEnd: row?.date_end ?? undefined,
    latestBalance:
      row?.latest_balance === null || row?.latest_balance === undefined ? undefined : toNumber(row.latest_balance),
    latestPeriod: row?.latest_period ?? undefined,
    lastSyncedAt: row?.last_synced_at ?? undefined,
    rowsInCsv: row?.rows_in_csv ?? undefined,
    rowsSynced: row?.rows_synced ?? undefined,
    maxIntervalSpend:
      row?.max_interval_spend === null || row?.max_interval_spend === undefined
        ? undefined
        : toNumber(row.max_interval_spend),
    maxIntervalKwh:
      row?.max_interval_kwh === null || row?.max_interval_kwh === undefined ? undefined : toNumber(row.max_interval_kwh)
  };
}

export async function loadDashboardDailyRollups(): Promise<DailyRollupRow[]> {
  const rows = await supabaseFetch<
    Array<{
      period_date: string;
      energy_spend: number | string;
      fixed_spend: number | string;
      topup_amount: number | string;
      total_spend: number | string;
      energy_kwh: number | string;
      weighted_tariff: number | string;
      peak_tariff: number | string;
      all_in_rate: number | string;
      balance_end: number | string;
      latest_period: string | null;
      energy_intervals: number | string;
      is_complete: boolean;
    }>
  >(
    "/energy_day_rollups?select=period_date,energy_spend,fixed_spend,topup_amount,total_spend,energy_kwh,weighted_tariff,peak_tariff,all_in_rate,balance_end,latest_period,energy_intervals,is_complete&order=period_date.asc"
  );

  return rows.map((row) => ({
    periodDate: row.period_date,
    energySpend: toNumber(row.energy_spend),
    fixedSpend: toNumber(row.fixed_spend),
    topupAmount: toNumber(row.topup_amount),
    totalSpend: toNumber(row.total_spend),
    energyKwh: toNumber(row.energy_kwh),
    weightedTariff: toNumber(row.weighted_tariff),
    peakTariff: toNumber(row.peak_tariff),
    allInRate: toNumber(row.all_in_rate),
    balanceEnd: toNumber(row.balance_end),
    latestPeriod: row.latest_period ?? undefined,
    energyIntervals: toNumber(row.energy_intervals),
    isComplete: Boolean(row.is_complete)
  }));
}

export async function loadDashboardHourlyRollups(): Promise<HourlyRollupRow[]> {
  const rows = await supabaseFetch<
    Array<{
      period_date: string;
      hour: number | string;
      spend: number | string;
      kwh: number | string;
      intervals: number | string;
    }>
  >("/energy_hourly_rollups?select=period_date,hour,spend,kwh,intervals&order=period_date.asc,hour.asc");

  return rows.map((row) => ({
    periodDate: row.period_date,
    hour: toNumber(row.hour),
    spend: toNumber(row.spend),
    kwh: toNumber(row.kwh),
    intervals: toNumber(row.intervals)
  }));
}

export async function loadDayIntervalRollups(periodDate: string): Promise<IntervalRollupRow[]> {
  const rows = await supabaseFetch<
    Array<{
      period_date: string;
      period_time: string;
      spend: number | string;
      kwh: number | string;
    }>
  >(
    `/energy_interval_rollups?select=period_date,period_time,spend,kwh&period_date=eq.${encodeURIComponent(periodDate)}&order=period_time.asc`
  );

  return rows.map((row) => ({
    periodDate: row.period_date,
    periodTime: row.period_time.slice(0, 5),
    spend: toNumber(row.spend),
    kwh: toNumber(row.kwh)
  }));
}
