"use client";

import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { buildAdminUsersUrl } from "@/lib/endpoints";
import { useAdminUsersUrlState } from "@/lib/use-admin-users-url-state";
import type { AdminUserListItem, LivemopayConnectionStatus, UserRole } from "@/lib/user-roles";

type AdminUsersTableProps = {
  currentUserId: string;
};

type AdminUsersApiResponse = {
  rows: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
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

async function fetchAdminUsers(params: URLSearchParams) {
  const response = await fetch(buildAdminUsersUrl(params), { cache: "no-store" });

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
        </tr>
      ))}
    </>
  );
}

export function AdminUsersTable({ currentUserId }: AdminUsersTableProps) {
  const { sortDirection, page, isPending, onSortChange, onPageChange } = useAdminUsersUrlState();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({});
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams();
  if (page > 1) {
    queryParams.set("page", String(page));
  }
  if (sortDirection !== "asc") {
    queryParams.set("dir", sortDirection);
  }

  const queryKey = ["admin-users", page, sortDirection];
  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchAdminUsers(queryParams),
    placeholderData: keepPreviousData
  });

  const users = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 15;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < pageCount;
  const showTableSkeleton = isLoading || isManualRefreshing;

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
              <th className="px-4 py-3 font-medium">AI assistant</th>
              <th className="px-4 py-3 font-medium">LiveMopay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {showTableSkeleton ? (
              <TableSkeletonRows rowCount={Math.min(pageSize, 15)} />
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Page {Math.min(page, pageCount)} of {pageCount}
          {!isLoading ? ` · ${total} users` : ""}
          {(isFetching || isPending) && !isLoading ? " · updating..." : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Refresh users"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm text-muted transition enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isManualRefreshing}
            onClick={() => {
              void handleRefresh();
            }}
            type="button"
            title="Refresh users"
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${isManualRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            className="inline-flex h-9 items-center rounded-md border border-line bg-paper px-3 text-sm text-muted transition enabled:hover:bg-canvas enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="inline-flex h-9 items-center rounded-md border border-line bg-paper px-3 text-sm text-muted transition enabled:hover:bg-canvas enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>

      {error instanceof Error ? <p className="px-3 py-2 text-sm text-red-500">{error.message}</p> : null}
    </Card>
  );
}
