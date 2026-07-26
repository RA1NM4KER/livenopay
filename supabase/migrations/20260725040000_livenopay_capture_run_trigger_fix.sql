-- Root cause of the backfill timeout: the trigger fired on every UPDATE to
-- capture_runs where status = 'success', with no check that status or
-- finished_at actually changed. Backfilling connection_id on already-
-- finished rows (an ownership-only update) re-triggered a full rollup
-- recompute once per row -- 151 times in one transaction for the legacy
-- data set.
--
-- Fix: move the "did this row just become a finished success" check into the
-- trigger's WHEN clause, split by INSERT vs UPDATE so OLD is only referenced
-- where it's meaningful. WHEN is evaluated before the trigger function is
-- invoked at all, so an ownership-only update (or any other column change on
-- an already-finished row) never calls handle_livenopay_capture_run_refresh
-- in the first place -- this is not a timeout-budget increase, it removes
-- the unnecessary work entirely.

drop trigger if exists capture_runs_refresh_rollups on public.capture_runs;

create trigger capture_runs_refresh_rollups_insert
  after insert on public.capture_runs
  for each row
  when (new.status = 'success' and new.finished_at is not null)
  execute function public.handle_livenopay_capture_run_refresh();

create trigger capture_runs_refresh_rollups_update
  after update on public.capture_runs
  for each row
  when (
    new.status = 'success'
    and new.finished_at is not null
    and (old.status is distinct from new.status or old.finished_at is distinct from new.finished_at)
  )
  execute function public.handle_livenopay_capture_run_refresh();
