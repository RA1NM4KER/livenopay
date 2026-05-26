create or replace function public.refresh_livenopay_rollups(p_run_id uuid)
returns void
language plpgsql
as $$
begin
  perform public.refresh_livenopay_rollups_for_run(p_run_id);
end;
$$;

create or replace function public.handle_livenopay_capture_run_refresh()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'success' and new.finished_at is not null then
    perform public.refresh_livenopay_rollups_for_run(new.id);
  end if;

  return new;
end;
$$;
