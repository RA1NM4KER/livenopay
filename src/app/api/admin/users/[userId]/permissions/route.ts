import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/auth/session";
import { setActivitiesEnabled, setAiAssistantEnabled, setLiveMeterEnabled } from "@/lib/user-roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z
  .object({
    aiAssistantEnabled: z.boolean().optional(),
    activitiesEnabled: z.boolean().optional(),
    liveMeterEnabled: z.boolean().optional()
  })
  .refine(
    (body) =>
      body.aiAssistantEnabled !== undefined ||
      body.activitiesEnabled !== undefined ||
      body.liveMeterEnabled !== undefined,
    {
      message: "Provide at least one permission to update."
    }
  );

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json(
      { message: auth.status === 401 ? "Authentication required." : "Admin access required." },
      { status: auth.status }
    );
  }

  const { aiAssistantEnabled, activitiesEnabled, liveMeterEnabled } = bodySchema.parse(await request.json());

  if (aiAssistantEnabled !== undefined) {
    await setAiAssistantEnabled(params.userId, aiAssistantEnabled);
  }

  if (activitiesEnabled !== undefined) {
    await setActivitiesEnabled(params.userId, activitiesEnabled);
  }

  if (liveMeterEnabled !== undefined) {
    await setLiveMeterEnabled(params.userId, liveMeterEnabled);
  }

  return NextResponse.json({ status: "updated" });
}
