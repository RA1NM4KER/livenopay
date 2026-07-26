"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Switch } from "@/components/ui/switch";
import type { AdminUserListItem, UserRole } from "@/lib/user-roles";

type AdminUsersTableProps = {
  initialUsers: AdminUserListItem[];
  currentUserId: string;
};

const roleOptions = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" }
];

export function AdminUsersTable({ initialUsers, currentUserId }: AdminUsersTableProps) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [errorByUserId, setErrorByUserId] = useState<Record<string, string>>({});

  function updateLocalUser(userId: string, patch: Partial<AdminUserListItem>) {
    setUsers((current) => current.map((user) => (user.userId === userId ? { ...user, ...patch } : user)));
  }

  async function handleRoleChange(userId: string, role: UserRole) {
    const previous = users.find((user) => user.userId === userId)?.role ?? "user";
    setErrorByUserId((current) => ({ ...current, [userId]: "" }));
    updateLocalUser(userId, { role });
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
      updateLocalUser(userId, { role: previous });
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
    updateLocalUser(userId, { aiAssistantEnabled });
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
      updateLocalUser(userId, { aiAssistantEnabled: previous });
      setErrorByUserId((current) => ({
        ...current,
        [userId]: caught instanceof Error ? caught.message : "Couldn't update permission."
      }));
    } finally {
      setPendingUserId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-line bg-canvas text-xs uppercase tracking-[0.16em] text-muted shadow-[0_1px_0_rgb(var(--color-line))]">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">AI assistant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((user) => {
              const isSelf = user.userId === currentUserId;
              const isPending = pendingUserId === user.userId;
              const error = errorByUserId[user.userId];

              return (
                <tr key={user.userId}>
                  <td className="px-4 py-3">
                    <p className="text-ink">{user.email ?? "Unknown"}</p>
                    {isSelf ? <p className="text-xs text-muted">This is you</p> : null}
                    {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
                      loading={isPending}
                      className="w-28"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      ariaLabel={`AI assistant access for ${user.email ?? user.userId}`}
                      checked={user.aiAssistantEnabled}
                      onChange={(checked) => void handleAiToggle(user.userId, checked)}
                      disabled={isPending}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
