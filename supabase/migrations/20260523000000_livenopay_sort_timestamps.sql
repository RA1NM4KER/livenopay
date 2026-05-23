alter table public.energy_rows
  add column if not exists period_ts timestamp without time zone
  generated always as (public.parse_livenopay_period_ts(period_dt)) stored;

alter table public.energy_rows
  add column if not exists capture_ts timestamp without time zone
  generated always as (public.parse_livenopay_capture_ts(capture_dt)) stored;

create index if not exists energy_rows_period_ts_idx
  on public.energy_rows (period_ts);

create index if not exists energy_rows_capture_ts_idx
  on public.energy_rows (capture_ts);
