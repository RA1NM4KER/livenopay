-- Activities is a per-user opt-in feature for now (e.g. testing with a
-- single user before a wider/paid rollout), so it defaults OFF -- the
-- inverse of ai_assistant_enabled's default-on posture. Toggled per user
-- from the admin users table, same as ai_assistant_enabled.
alter table public.user_roles
  add column activities_enabled boolean not null default false;
