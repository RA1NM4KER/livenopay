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

  const users = await listAllUserPermissions();
  return NextResponse.json({ users });
}
