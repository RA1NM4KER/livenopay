import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDashboardSummary } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const syncRequestSchema = z.object({
  mode: z.enum(["incremental", "full"]).catch("incremental")
});

type SyncResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

let activeSync: Promise<SyncResult> | null = null;

function runSync(mode: "incremental" | "full") {
  const args = ["refresh_and_sync.py", "--source", "web"];

  if (mode === "full") {
    args.push("--full");
  }

  return new Promise<SyncResult>((resolve, reject) => {
    const child = spawn("python3", args, {
      cwd: process.cwd(),
      env: process.env
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, exitCode: 0 });
        return;
      }

      reject(new Error(stderr.trim() || stdout.trim() || `Sync failed with exit code ${exitCode ?? "unknown"}.`));
    });
  });
}

export async function POST(request: Request) {
  if (activeSync) {
    return NextResponse.json({ message: "A sync is already running." }, { status: 409 });
  }

  try {
    const body = syncRequestSchema.parse(await request.json().catch(() => ({})));
    activeSync = runSync(body.mode);

    const result = await activeSync;
    const summary = await loadDashboardSummary();

    return NextResponse.json({
      mode: body.mode,
      summary,
      output: result.stdout.trim()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    return NextResponse.json({ message }, { status: 500 });
  } finally {
    activeSync = null;
  }
}
