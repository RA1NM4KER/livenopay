-- Supabase Advisor flagged public.user_roles (admin/user role +
-- ai_assistant_enabled per user) as RLS-disabled -- critical, since it's
-- a public-schema table reachable over PostgREST.
--
-- No policies needed: every app-code access to this table goes through
-- the service-role client (adminSupabaseFetch/adminSupabaseRequest in
-- src/lib/user-roles.ts), which bypasses RLS entirely. Nothing legitimate
-- ever queries it with a user's own token, so default-deny (RLS on, zero
-- policies) closes the gap without touching any existing behavior.
alter table public.user_roles enable row level security;
