-- The /data table was timing out (statement_timeout) even after switching
-- to count=planned, because the row-fetch query itself is expensive:
-- owns_livemopay_connection(connection_id) is called once per candidate
-- row across the WHOLE energy_rows table (292k+ rows, all users combined),
-- not just the requesting user's own rows.
--
-- Root cause: it's a SECURITY DEFINER function, which Postgres can never
-- inline into the query plan (a hard planner limitation, independent of
-- being STABLE/LANGUAGE SQL). Worse, it takes the ROW's own connection_id
-- as an argument, so even if it could be evaluated cheaply, the planner
-- has no way to know the result is constant across a user's own rows --
-- it must call the function separately for every row it scans.
--
-- Fix: a scalar, argument-free (per query) function that returns the
-- caller's own connection id once. Since it takes no row-dependent
-- argument, Postgres evaluates it a single time per query and can then
-- use `connection_id = <that value>` as a plain, sargable, indexed
-- equality predicate -- instead of an opaque per-row function call.
-- Same security guarantee (still scoped to auth.uid(), still only
-- returns an id, never exposes livemopay_connections' other columns),
-- just expressed so the planner can act on it.
create or replace function public.my_livemopay_connection_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id
  from public.livemopay_connections
  where user_id = auth.uid();
$$;

revoke all on function public.my_livemopay_connection_id() from public;
grant execute on function public.my_livemopay_connection_id() to authenticated;

drop policy if exists "energy rows are readable by owner" on public.energy_rows;
create policy "energy rows are readable by owner"
  on public.energy_rows
  for select
  to authenticated
  using (connection_id = public.my_livemopay_connection_id());

drop policy if exists "capture runs are readable by owner" on public.capture_runs;
create policy "capture runs are readable by owner"
  on public.capture_runs
  for select
  to authenticated
  using (connection_id = public.my_livemopay_connection_id());

drop policy if exists "energy day rollups are readable by owner" on public.energy_day_rollups;
create policy "energy day rollups are readable by owner"
  on public.energy_day_rollups
  for select
  to authenticated
  using (connection_id = public.my_livemopay_connection_id());

drop policy if exists "energy hourly rollups are readable by owner" on public.energy_hourly_rollups;
create policy "energy hourly rollups are readable by owner"
  on public.energy_hourly_rollups
  for select
  to authenticated
  using (connection_id = public.my_livemopay_connection_id());

drop policy if exists "energy interval rollups are readable by owner" on public.energy_interval_rollups;
create policy "energy interval rollups are readable by owner"
  on public.energy_interval_rollups
  for select
  to authenticated
  using (connection_id = public.my_livemopay_connection_id());

drop policy if exists "dashboard summary is readable by owner" on public.dashboard_summary;
create policy "dashboard summary is readable by owner"
  on public.dashboard_summary
  for select
  to authenticated
  using (connection_id = public.my_livemopay_connection_id());
