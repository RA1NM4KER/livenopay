-- Enforces ownership on the ledger/rollup tables (everything except
-- dashboard_summary, which changes shape together with the rollup function
-- and the application read/sync path in the next migration). Run only after
-- scripts/backfill-legacy-owner.ts has assigned connection_id to every
-- existing row -- this migration will fail loudly (not null violation) if
-- any row was missed, which is the intended safety behavior.

alter table public.energy_rows
  alter column connection_id set not null;

alter table public.capture_runs
  alter column connection_id set not null;

alter table public.energy_day_rollups
  alter column connection_id set not null;

alter table public.energy_hourly_rollups
  alter column connection_id set not null;

alter table public.energy_interval_rollups
  alter column connection_id set not null;

-- energy_rows: the natural key must include connection_id so two owners can
-- have identical tariff/date/cost/balance combinations without colliding.
drop index if exists energy_rows_ledger_key;
create unique index energy_rows_ledger_key
  on public.energy_rows (connection_id, charge_label, period_dt, cost, balance);

-- Rollup tables: PK gains connection_id as the leading column.
alter table public.energy_day_rollups drop constraint energy_day_rollups_pkey;
alter table public.energy_day_rollups add primary key (connection_id, period_date);

alter table public.energy_hourly_rollups drop constraint energy_hourly_rollups_pkey;
alter table public.energy_hourly_rollups add primary key (connection_id, period_date, hour);

alter table public.energy_interval_rollups drop constraint energy_interval_rollups_pkey;
alter table public.energy_interval_rollups add primary key (connection_id, period_date, period_time);

-- Sync concurrency: replaces the in-memory `activeSync` variable, which was
-- already unsound across concurrent serverless instances for a single user.
-- This makes "one running sync per connection" a database-enforced fact, and
-- lets different users' connections sync at the same time.
create unique index capture_runs_one_running_per_connection
  on public.capture_runs (connection_id)
  where status = 'running';

-- RLS cutover: remove anonymous read access, add authenticated ownership
-- policies via the SECURITY DEFINER helper from the connections migration.
drop policy if exists "energy rows are readable" on public.energy_rows;
create policy "energy rows are readable by owner"
  on public.energy_rows
  for select
  to authenticated
  using (public.owns_livemopay_connection(connection_id));

drop policy if exists "capture runs are readable" on public.capture_runs;
create policy "capture runs are readable by owner"
  on public.capture_runs
  for select
  to authenticated
  using (public.owns_livemopay_connection(connection_id));

drop policy if exists "energy day rollups are readable" on public.energy_day_rollups;
create policy "energy day rollups are readable by owner"
  on public.energy_day_rollups
  for select
  to authenticated
  using (public.owns_livemopay_connection(connection_id));

drop policy if exists "energy hourly rollups are readable" on public.energy_hourly_rollups;
create policy "energy hourly rollups are readable by owner"
  on public.energy_hourly_rollups
  for select
  to authenticated
  using (public.owns_livemopay_connection(connection_id));

drop policy if exists "energy interval rollups are readable" on public.energy_interval_rollups;
create policy "energy interval rollups are readable by owner"
  on public.energy_interval_rollups
  for select
  to authenticated
  using (public.owns_livemopay_connection(connection_id));

-- Normal authenticated users never insert/update/delete ledger rows, capture
-- runs, or rollups directly -- all writes happen server-side through the
-- service-role client in the sync path, which bypasses RLS entirely. No
-- authenticated write policies are created on these tables.
revoke all on public.energy_rows from anon;
revoke all on public.capture_runs from anon;
revoke all on public.energy_day_rollups from anon;
revoke all on public.energy_hourly_rollups from anon;
revoke all on public.energy_interval_rollups from anon;
