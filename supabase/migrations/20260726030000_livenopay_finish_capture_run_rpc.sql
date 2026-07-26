-- Neither of the previous two attempts actually raised the timeout in time:
--
-- 1. `set local statement_timeout` inside refresh_livenopay_rollups_for_run
--    fires too late -- that function only runs as an AFTER trigger
--    side-effect partway through the PATCH's UPDATE statement, and Postgres
--    arms a statement's timeout once, at the start of that statement,
--    using whatever value was in effect at that moment.
-- 2. `alter role service_role set statement_timeout` has no effect either:
--    PostgREST connects its pool once as `authenticator` and does
--    `set local role service_role` per request rather than opening a new
--    session as service_role, and role-level defaults from `alter role ...
--    set` are only applied at actual session start, not on a mid-session
--    role switch.
--
-- Fix: wrap the finalize step in its own function so `set local
-- statement_timeout` is a genuinely separate, preceding statement (not
-- nested inside the one it's trying to extend) before the UPDATE -- and
-- therefore its cascading trigger -- ever begins.
create or replace function public.finish_capture_run(
  p_run_id uuid,
  p_status text,
  p_rows_synced integer default null,
  p_error text default null
)
returns void
language plpgsql
as $$
begin
  set local statement_timeout = '5min';

  update public.capture_runs
  set finished_at = now(),
      status = p_status,
      rows_synced = p_rows_synced,
      error = p_error
  where id = p_run_id;
end;
$$;

grant execute on function public.finish_capture_run(uuid, text, integer, text) to service_role;
