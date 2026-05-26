alter table public.energy_rows
  add column if not exists source_ts timestamptz;

create index if not exists energy_rows_source_ts_idx
  on public.energy_rows (source_ts);
