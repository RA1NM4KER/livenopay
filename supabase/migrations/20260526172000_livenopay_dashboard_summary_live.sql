create or replace view public.dashboard_summary_live as
with latest_sync as (
  select
    finished_at as last_synced_at,
    rows_in_csv,
    rows_synced
  from public.capture_runs
  where status = 'success'
  order by finished_at desc nulls last, started_at desc
  limit 1
),
latest_ledger as (
  select
    balance as latest_balance,
    period_dt as latest_period
  from public.energy_rows
  order by
    source_ts desc nulls last,
    public.parse_livenopay_capture_ts(capture_dt) desc,
    public.parse_livenopay_period_ts(period_dt) desc,
    id desc
  limit 1
),
date_bounds as (
  select
    min(period_date) as date_start,
    max(period_date) as date_end
  from public.energy_day_rollups
),
interval_max as (
  select
    coalesce(max(spend), 0) as max_interval_spend,
    coalesce(max(kwh), 0) as max_interval_kwh
  from public.energy_interval_rollups
)
select
  1 as id,
  date_bounds.date_start,
  date_bounds.date_end,
  latest_ledger.latest_balance,
  latest_ledger.latest_period,
  latest_sync.last_synced_at,
  latest_sync.rows_in_csv,
  latest_sync.rows_synced,
  interval_max.max_interval_spend,
  interval_max.max_interval_kwh
from date_bounds
cross join interval_max
left join latest_ledger on true
left join latest_sync on true;

grant select on public.dashboard_summary_live to anon, authenticated, service_role;
