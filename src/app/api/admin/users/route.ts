import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { listAllUserPermissions } from "@/lib/user-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.status === 401 ? "Authentication required." : "Admin access required." },
      { status: auth.status }
    );
  }

  // Supabase Auth's admin API has no sort/filter params of its own, so there's
  // nothing to page server-side without refetching the same full list on
  // every click. Given that, the honest design is: send the whole list once,
  // sort/paginate (if ever needed again) on the client.
  const rows = await listAllUserPermissions();
  return NextResponse.json({ rows, total: rows.length });
}
