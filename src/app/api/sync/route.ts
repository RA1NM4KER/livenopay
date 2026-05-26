import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDashboardSummary } from "@/lib/dashboard-data";
import { runLivenopayWebSync } from "@/lib/livenopay-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const syncRequestSchema = z.object({
  mode: z.enum(["incremental", "full"]).catch("incremental")
});

type SyncResult = Awaited<ReturnType<typeof runLivenopayWebSync>>;

let activeSync: Promise<SyncResult> | null = null;

export async function POST(request: Request) {
  if (activeSync) {
    return NextResponse.json({ message: "A sync is already running." }, { status: 409 });
  }

  try {
    const body = syncRequestSchema.parse(await request.json().catch(() => ({})));
    activeSync = runLivenopayWebSync(body.mode);

    const result = await activeSync;
    const summary = await loadDashboardSummary();

    return NextResponse.json({
      mode: body.mode,
      summary,
      output: result.output
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    return NextResponse.json({ message }, { status: 500 });
  } finally {
    activeSync = null;
  }
}
