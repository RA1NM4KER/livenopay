import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { savePushSubscription } from "@/lib/push-subscriptions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Shape a browser PushSubscription.toJSON() produces. keys are always present
// for a userVisibleOnly subscription created with an applicationServerKey.
const requestSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
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
    return NextResponse.json({ message: "Invalid push subscription." }, { status: 400 });
  }

  await savePushSubscription(session.userId, {
    endpoint: body.endpoint,
    p256dh: body.keys.p256dh,
    auth: body.keys.auth
  });

  return NextResponse.json({ ok: true });
}
