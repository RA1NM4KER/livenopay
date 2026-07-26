import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { deleteAccountForUser } from "@/lib/livenopay-connection";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  await deleteAccountForUser(session.userId);

  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.json({ status: "deleted" });
}
