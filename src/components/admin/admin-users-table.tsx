"use client";

import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiEndpoints } from "@/lib/endpoints";
import { useAdminUsersUrlState } from "@/lib/use-admin-users-url-state";
import type { AdminUserListItem, CaptureRunStatus, LivemopayConnectionStatus, UserRole } from "@/lib/user-roles";

const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type AdminUsersTableProps = {
  currentUserId: string;
  initialData: AdminUsersApiResponse;
};

type AdminUsersApiResponse = {
  rows: AdminUserListItem[];
  total: number;
};

const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" }
];

const connectionStatusLabel: Record<LivemopayConnectionStatus, string> = {
  connected: "Connected",
  pending_selection: "Choosing account",
  disconnected: "Disconnected",
  error: "Error"
};

const connectionStatusDotClass: Record<LivemopayConnectionStatus, string> = {
  connected: "bg-accent",
  pending_selection: "bg-amber-500",
  disconnected: "bg-muted",
  error: "bg-red-500"
};

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.round(diffDays / 30);
  return `${diffMonths}mo ago`;
}

const lastRunLabel: Record<CaptureRunStatus, string> = {
  success: "Synced",
  failed: "Failed",
  running: "Syncing"
};

const lastRunDotClass: Record<CaptureRunStatus, string> = {
  success: "bg-accent",
  failed: "bg-red-500",
  running: "bg-amber-500"
};

function LastSyncCell({ user }: { user: AdminUserListItem }) {
  if (!user.lastRunStatus || !user.lastRunAt) {
    return <span className="text-xs text-muted">No sync yet</span>;
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs text-ink"
      title={user.lastRunStatus === "failed" ? user.lastRunError ?? "Sync failed" : undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${lastRunDotClass[user.lastRunStatus]}`} aria-hidden="true" />
      {lastRunLabel[user.lastRunStatus]} · {formatRelativeTime(user.lastRunAt)}
    </span>
  );
}

type StatTileProps = { label: string; value: number; tone?: "default" | "warning" };

function StatTile({ label, value, tone = "default" }: StatTileProps) {
  return (
    <Card className="flex-1 px-2 py-2 sm:px-4 sm:py-3">
      <p className="truncate text-[0.6rem] uppercase tracking-[0.1em] text-muted sm:text-xs sm:tracking-[0.12em]">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums sm:text-2xl ${tone === "warning" && value > 0 ? "text-red-500" : "text-ink"}`}
      >
        {value}
      </p>
    </Card>
  );
}

function StatStripSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="px-2 py-2 sm:px-4 sm:py-3">
          <Skeleton className="h-3 w-10 sm:w-16" />
          <Skeleton className="mt-2 h-5 w-6 sm:h-7 sm:w-10" />
        </Card>
      ))}
    </div>
  );
}

function ConnectionStatusBadge({ status }: { status: LivemopayConnectionStatus | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-muted/50" aria-hidden="true" />
        Never connected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink">
      <span className={`h-1.5 w-1.5 rounded-full ${connectionStatusDotClass[status]}`} aria-hidden="true" />
      {connectionStatusLabel[status]}
    </span>
  );
}

async function fetchAdminUsers() {
  const response = await fetch(apiEndpoints.adminUsers, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to load users.");
  }

  return (await response.json()) as AdminUsersApiResponse;
}

function TableSkeletonRows({ rowCount }: { rowCount: number }) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={`skeleton-${rowIndex}`}>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-28" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-6 w-10 rounded-full" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function AdminUsersTable({ currentUserId, initialData }: AdminUsersTableProps) {
  const { sortDirection, onSortChange } = useAdminUsersUrlState();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({});
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // The whole list, fetched once. Supabase Auth's admin API has no
  // sort/filter params of its own -- paginating "server-side" would just
  // mean refetching this same full list on every click for no benefit.
  // Sorting/pagination (if ever needed again) happens client-side instead.
  const queryKey = ["admin-users"];
  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchAdminUsers,
    initialData
  });

  // Server returns oldest-joined-first.
  const users = useMemo(() => {
    const rows = data?.rows ?? [];
    return sortDirection === "desc" ? [...rows].reverse() : rows;
  }, [data?.rows, sortDirection]);
  const total = data?.total ?? 0;
  const showTableSkeleton = isLoading || isManualRefreshing;

  const stats = useMemo(() => {
    const rows = data?.rows ?? [];
    const now = Date.now();

    return {
      connected: rows.filter((user) => user.connectionStatus === "connected").length,
      needsHelp: rows.filter((user) => user.lastRunStatus === "failed").length,
      active: rows.filter(
        (user) => user.lastRunStatus === "success" && user.lastRunAt && now - new Date(user.lastRunAt).getTime() < ACTIVE_WINDOW_MS
      ).length
    };
  }, [data?.rows]);

  function patchLocalUser(userId: string, patch: Partial<AdminUserListItem>) {
    queryClient.setQueryData<AdminUsersApiResponse | undefined>(queryKey, (current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        rows: current.rows.map((user) => (user.userId === userId ? { ...user, ...patch } : user))
      };
    });
  }

  const handleRefresh = async () => {
    setIsManualRefreshing(true);

    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  async function handleRoleChange(userId: string, role: UserRole) {
    const previous = users.find((user) => user.userId === userId)?.role ?? "user";
    setErrorByUserId((current) => ({ ...current, [userId]: "" }));
    patchLocalUser(userId, { role });
    setPendingUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Couldn't update role.");
      }
    } catch (caught) {
      patchLocalUser(userId, { role: previous });
      setErrorByUserId((current) => ({
        ...current,
        [userId]: caught instanceof Error ? caught.message : "Couldn't update role."
      }));
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleAiToggle(userId: string, aiAssistantEnabled: boolean) {
    const previous = users.find((user) => user.userId === userId)?.aiAssistantEnabled ?? true;
    setErrorByUserId((current) => ({ ...current, [userId]: "" }));
    patchLocalUser(userId, { aiAssistantEnabled });
    setPendingUserId(userId);

    try {
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiAssistantEnabled })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Couldn't update permission.");
      }
    } catch (caught) {
      patchLocalUser(userId, { aiAssistantEnabled: previous });
      setErrorByUserId((current) => ({
        ...current,
        [userId]: caught instanceof Error ? caught.message : "Couldn't update permission."
      }));
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {showTableSkeleton ? (
        <StatStripSkeleton />
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <StatTile label="Total users" value={total} />
          <StatTile label="Connected" value={stats.connected} />
          <StatTile label="Active (7d)" value={stats.active} />
          <StatTile label="Needs help" value={stats.needsHelp} tone="warning" />
        </div>
      )}

      <Card className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-line bg-accentSoft text-xs uppercase tracking-[0.16em] text-brandTeal dark:text-accent shadow-[0_1px_0_rgb(var(--color-line))]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">
                <button className="inline-flex items-center font-medium uppercase tracking-[0.16em]" onClick={onSortChange} type="button">
                  Joined
                  {sortDirection === "asc" ? (
                    <ArrowUp aria-hidden="true" className="ml-1 h-3.5 w-3.5 text-ink" />
                  ) : (
                    <ArrowDown aria-hidden="true" className="ml-1 h-3.5 w-3.5 text-ink" />
                  )}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">
                <span className="sm:hidden">AI</span>
                <span className="hidden sm:inline">AI assistant</span>
              </th>
              <th className="px-4 py-3 font-medium">LiveMopay</th>
              <th className="px-4 py-3 font-medium">
                <span className="sm:hidden">Sync</span>
                <span className="hidden sm:inline">Last sync</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {showTableSkeleton ? (
              <TableSkeletonRows rowCount={8} />
            ) : (
              users.map((user) => {
                const isSelf = user.userId === currentUserId;
                const isUserPending = pendingUserId === user.userId;
                const rowError = errorByUserId[user.userId];

                return (
                  <tr key={user.userId}>
                    <td className="px-4 py-3">
                      <p className="text-ink">{user.email ?? "Unknown"}</p>
                      {isSelf ? <p className="text-xs text-muted">This is you</p> : null}
                      {rowError ? <p className="text-xs text-red-600">{rowError}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <DropdownSelect
                        ariaLabel={`Role for ${user.email ?? user.userId}`}
                        value={user.role}
                        options={
                          isSelf
                            ? roleOptions.map((option) =>
                                option.value === "user" ? { ...option, disabled: true } : option
                              )
                            : roleOptions
                        }
                        onChange={(value) => void handleRoleChange(user.userId, value as UserRole)}
                        loading={isUserPending}
                        className="w-28"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        ariaLabel={`AI assistant access for ${user.email ?? user.userId}`}
                        checked={user.aiAssistantEnabled}
                        onChange={(checked) => void handleAiToggle(user.userId, checked)}
                        disabled={isUserPending}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ConnectionStatusBadge status={user.connectionStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <LastSyncCell user={user} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-t border-line px-3">
        <p className="text-sm text-muted">
          {!isLoading ? `${total} users` : "Loading users..."}
          {isFetching && !isLoading ? " · updating..." : ""}
        </p>
        <button
          aria-label="Refresh users"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-sm text-muted transition enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isManualRefreshing}
          onClick={() => {
            void handleRefresh();
          }}
          type="button"
          title="Refresh users"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isManualRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error instanceof Error ? <p className="px-3 py-2 text-sm text-red-500">{error.message}</p> : null}
      </Card>
    </div>
  );
}
