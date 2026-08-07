import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { deletePushSubscription } from "@/lib/push-subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const requestSchema = z.object({
  endpoint: z.string().url()
});

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();
  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  await deletePushSubscription(session.userId, body.endpoint);

  return NextResponse.json({ ok: true });
}
