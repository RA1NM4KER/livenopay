import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { disconnectLivemopayConnection } from "@/lib/livenopay-connection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  await disconnectLivemopayConnection(session.userId);
  return NextResponse.json({ status: "disconnected" });
}
