import { notFound } from "next/navigation";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllUserPermissions } from "@/lib/user-roles";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    notFound();
  }

  const users = await listAllUserPermissions();

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted">Manage user roles and permissions.</p>
      </div>

      <AdminUsersTable initialUsers={users} currentUserId={auth.session.userId} />
    </div>
  );
}
