-- One-time backfill helper for scripts/backfill-legacy-owner.ts. Wraps the
-- ownership assignment for a single legacy connection in one transaction
-- (a single plpgsql function body is atomic) so it either fully applies or
-- fully fails -- there is no REST-level equivalent of a multi-statement
-- transaction available to a standalone script, so this function is the
-- transactional boundary instead.
--
-- Only ever called with the service-role key (which is how
-- scripts/backfill-legacy-owner.ts invokes it via supabase-js .rpc()); the
-- explicit ownership check inside still guards against being called with a
-- mismatched user_id/connection_id pair by mistake.
create or replace function public.backfill_legacy_owner_data(p_connection_id uuid, p_user_id uuid)
returns table (
  energy_rows_updated bigint,
  capture_runs_updated bigint,
  day_rollups_updated bigint,
  hourly_rollups_updated bigint,
  interval_rollups_updated bigint,
  dashboard_summary_updated bigint
)
language plpgsql
as $$
declare
  v_energy_rows bigint;
  v_capture_runs bigint;
  v_day_rollups bigint;
  v_hourly_rollups bigint;
  v_interval_rollups bigint;
  v_dashboard_summary bigint;
begin
  if not exists (
    select 1 from public.livemopay_connections where id = p_connection_id and user_id = p_user_id
  ) then
    raise exception 'connection % does not belong to user %', p_connection_id, p_user_id;
  end if;

  update public.energy_rows set connection_id = p_connection_id where connection_id is null;
  get diagnostics v_energy_rows = row_count;

  update public.capture_runs set connection_id = p_connection_id where connection_id is null;
  get diagnostics v_capture_runs = row_count;

  update public.energy_day_rollups set connection_id = p_connection_id where connection_id is null;
  get diagnostics v_day_rollups = row_count;

  update public.energy_hourly_rollups set connection_id = p_connection_id where connection_id is null;
  get diagnostics v_hourly_rollups = row_count;

  update public.energy_interval_rollups set connection_id = p_connection_id where connection_id is null;
  get diagnostics v_interval_rollups = row_count;

  update public.dashboard_summary set connection_id = p_connection_id where connection_id is null;
  get diagnostics v_dashboard_summary = row_count;

  return query
    select v_energy_rows, v_capture_runs, v_day_rollups, v_hourly_rollups, v_interval_rollups, v_dashboard_summary;
end;
$$;

revoke all on function public.backfill_legacy_owner_data(uuid, uuid) from public, anon, authenticated;
