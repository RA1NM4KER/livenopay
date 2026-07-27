import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { adminUsersPageSize, parseAdminUsersQuery } from "@/lib/admin-users-query-params";
import { listAdminUsersPage } from "@/lib/user-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.status === 401 ? "Authentication required." : "Admin access required." },
      { status: auth.status }
    );
  }

  const { searchParams } = new URL(request.url);
  const parsed = parseAdminUsersQuery(searchParams);

  const result = await listAdminUsersPage({
    page: parsed.page,
    pageSize: adminUsersPageSize,
    sortDirection: parsed.sortDirection
  });

  return NextResponse.json(result);
}
