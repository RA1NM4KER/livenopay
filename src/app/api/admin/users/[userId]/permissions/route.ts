import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { setAiAssistantEnabled } from "@/lib/user-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  aiAssistantEnabled: z.boolean()
});

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.status === 401 ? "Authentication required." : "Admin access required." },
      { status: auth.status }
    );
  }

  const { aiAssistantEnabled } = bodySchema.parse(await request.json());

  await setAiAssistantEnabled(params.userId, aiAssistantEnabled);
  return NextResponse.json({ status: "updated" });
}
