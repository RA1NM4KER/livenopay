import "server-only";

import { adminSupabaseFetch, adminSupabaseRequest } from "./supabase-rest";
import { createSupabaseAdminClient } from "./supabase/admin-client";

export type UserRole = "admin" | "user";

export type UserPermissions = {
  userId: string;
  role: UserRole;
  aiAssistantEnabled: boolean;
};

type UserRoleRow = {
  user_id: string;
  role: UserRole;
  ai_assistant_enabled: boolean;
};

const SELECT = "user_id,role,ai_assistant_enabled";

function toPermissions(row: UserRoleRow): UserPermissions {
  return {
    userId: row.user_id,
    role: row.role,
    aiAssistantEnabled: row.ai_assistant_enabled
  };
}

// Lazily provisions a role row on first authenticated access, so every
// signed-in user has one without needing a signup-time hook. Defaults to
// 'user' -- the one seed admin is created by migration instead.
export async function getOrCreateUserPermissions(userId: string): Promise<UserPermissions> {
  const rows = await adminSupabaseFetch<UserRoleRow[]>(
    `/user_roles?select=${SELECT}&user_id=eq.${encodeURIComponent(userId)}&limit=1`
  );

  if (rows[0]) {
    return toPermissions(rows[0]);
  }

  const created = await adminSupabaseRequest<UserRoleRow[]>(
    "POST",
    "/user_roles",
    [{ user_id: userId }],
    "return=representation"
  );

  return toPermissions(created[0]);
}

export type LivemopayConnectionStatus = "connected" | "pending_selection" | "disconnected" | "error";

export type AdminUserListItem = UserPermissions & {
  email: string | null;
  createdAt: string;
  connectionStatus: LivemopayConnectionStatus | null;
};

type ConnectionStatusRow = {
  user_id: string;
  status: LivemopayConnectionStatus;
  updated_at: string;
};

// Admin's user list: role/permission rows joined against Supabase Auth's
// user list (for email), since auth.users isn't exposed over PostgREST.
// Anyone who has never triggered getOrCreateUserPermissions (signed in but
// never loaded a page that resolves it) still gets a synthesized 'user' row
// here so they aren't invisible to the admin.
export async function listAllUserPermissions(): Promise<AdminUserListItem[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });

  if (error) {
    throw new Error(error.message);
  }

  const roleRows = await adminSupabaseFetch<UserRoleRow[]>(`/user_roles?select=${SELECT}`);
  const roleByUserId = new Map(roleRows.map((row) => [row.user_id, toPermissions(row)]));

  // A user can have more than one connection row over time (e.g. an old
  // 'error'/'disconnected' row plus a later reconnect) -- ordering by
  // updated_at desc and keeping the first hit per user_id gives the current
  // one.
  const connectionRows = await adminSupabaseFetch<ConnectionStatusRow[]>(
    "/livemopay_connections?select=user_id,status,updated_at&order=updated_at.desc"
  );
  const connectionStatusByUserId = new Map<string, LivemopayConnectionStatus>();
  for (const row of connectionRows) {
    if (!connectionStatusByUserId.has(row.user_id)) {
      connectionStatusByUserId.set(row.user_id, row.status);
    }
  }

  return data.users
    .map((user) => {
      const permissions = roleByUserId.get(user.id);

      return {
        userId: user.id,
        email: user.email ?? null,
        createdAt: user.created_at,
        role: permissions?.role ?? "user",
        aiAssistantEnabled: permissions?.aiAssistantEnabled ?? true,
        connectionStatus: connectionStatusByUserId.get(user.id) ?? null
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await getOrCreateUserPermissions(userId);

  await adminSupabaseRequest(
    "PATCH",
    `/user_roles?user_id=eq.${encodeURIComponent(userId)}`,
    { role, updated_at: new Date().toISOString() },
    "return=minimal"
  );
}

export async function setAiAssistantEnabled(userId: string, enabled: boolean): Promise<void> {
  await getOrCreateUserPermissions(userId);

  await adminSupabaseRequest(
    "PATCH",
    `/user_roles?user_id=eq.${encodeURIComponent(userId)}`,
    { ai_assistant_enabled: enabled, updated_at: new Date().toISOString() },
    "return=minimal"
  );
}
