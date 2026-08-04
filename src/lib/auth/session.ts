import "server-only";

import { getConnectionForUser, type LivemopayConnection } from "@/lib/newinmeter-connection";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getOrCreateUserPermissions, type UserPermissions } from "@/lib/user-roles";

export type AuthenticatedSession = {
  userId: string;
  email: string | null;
  accessToken: string;
};

// The one place "who is making this request" gets resolved. Every route
// handler and server component that needs the caller's identity calls this
// instead of touching the Supabase client directly.
export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return null;
  }

  return { userId: user.id, email: user.email ?? null, accessToken: session.access_token };
}

export type AuthenticatedConnectionSession = AuthenticatedSession & { connection: LivemopayConnection };

export type RequireConnectedSessionResult =
  | { ok: true; session: AuthenticatedConnectionSession }
  | { ok: false; status: 401 | 409 };

// Shared guard for every route that reads or syncs a user's LiveMopay data:
// resolves the caller, then resolves their one active connection. Routes
// never accept a user id or connection id from the request body -- both
// come from here.
export async function requireConnectedSession(): Promise<RequireConnectedSessionResult> {
  const session = await getAuthenticatedSession();

  if (!session) {
    return { ok: false, status: 401 };
  }

  const connection = await getConnectionForUser(session.userId);

  if (!connection || connection.status !== "connected") {
    return { ok: false, status: 409 };
  }

  return { ok: true, session: { ...session, connection } };
}

export type RequireActivitiesSessionResult =
  | { ok: true; session: AuthenticatedConnectionSession }
  | { ok: false; status: 401 | 403 | 409 };

// Shared guard for every activities route: resolves the connected session
// (same as requireConnectedSession), then additionally requires the
// activities_enabled flag -- a per-user opt-in while the feature is being
// tested with one user, not yet a general release.
export async function requireActivitiesSession(): Promise<RequireActivitiesSessionResult> {
  const connected = await requireConnectedSession();

  if (!connected.ok) {
    return connected;
  }

  const permissions = await getOrCreateUserPermissions(connected.session.userId);

  if (!permissions.activitiesEnabled) {
    return { ok: false, status: 403 };
  }

  return connected;
}

export type AuthenticatedPermissionSession = AuthenticatedSession & { permissions: UserPermissions };

export type RequireAdminSessionResult =
  | { ok: true; session: AuthenticatedPermissionSession }
  | { ok: false; status: 401 | 403 };

// Shared guard for every admin-only route/page: resolves the caller, then
// checks their role. Never trusts a role or user id from the request --
// both come from the resolved session and its own permissions row.
export async function requireAdminSession(): Promise<RequireAdminSessionResult> {
  const session = await getAuthenticatedSession();

  if (!session) {
    return { ok: false, status: 401 };
  }

  const permissions = await getOrCreateUserPermissions(session.userId);

  if (permissions.role !== "admin") {
    return { ok: false, status: 403 };
  }

  return { ok: true, session: { ...session, permissions } };
}
