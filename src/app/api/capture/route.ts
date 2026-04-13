import { spawn } from "child_process";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function parseProgressLine(line: string) {
  const progress = line.match(/^\[(\d+)\] added=(\d+) new=(\d+) total=(\d+)/);
  const incrementalDone = line.match(/Done\. Added (\d+) new rows\. Wrote (\d+) rows/);
  const fullDone = line.match(/Done\. Rebuilt .* with (\d+) rows\./);

  if (line.startsWith("CAPTURE_LOG: ")) {
    return {
      type: "progress",
      message: "Capture setup...",
      detail: line.replace("CAPTURE_LOG: ", "")
    };
  }

  if (progress) {
    return {
      type: "progress",
      message: `Scanning page ${progress[1]}...`,
      detail: `${progress[3]} new rows, ${progress[4]} total.`
    };
  }

  if (incrementalDone) {
    const added = Number(incrementalDone[1]);
    const total = Number(incrementalDone[2]);

    return {
      type: "done",
      message: added === 0 ? "Already up to date." : `Imported ${added} new ${added === 1 ? "row" : "rows"}.`,
      detail: `${total} rows in the local CSV.`
    };
  }

  if (fullDone) {
    return {
      type: "done",
      message: "Full recapture complete.",
      detail: `${Number(fullDone[1])} rows rebuilt in the local CSV.`
    };
  }

  if (line.startsWith("Starting full recapture")) {
    return {
      type: "progress",
      message: "Starting full recapture...",
      detail: "Rebuilding the CSV from the Android history."
    };
  }

  if (line.startsWith("Preparing LiveMopay ledger screen")) {
    return {
      type: "progress",
      message: "Opening ledger history...",
      detail: "Resetting the Android app to the newest ledger entries."
    };
  }

  return {
    type: "log",
    message: line
  };
}

function encodeEvent(event: object) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function friendlyCaptureError(stderr: string, code: number | null) {
  const raw = stderr.trim();

  if (raw.includes("SETUP_REQUIRED")) {
    return "Open LiveMopay, go to the Ledger tab, tap the orange Ledger button, then scroll to the newest entries at the top before refreshing capture.";
  }

  if (raw.includes("ADB_NOT_FOUND")) {
    return "ADB is not installed. Install Android platform tools, then try again. On macOS with Homebrew: brew install android-platform-tools.";
  }

  if (raw.includes("ADB_UNAUTHORIZED")) {
    return "Unlock the Android phone and tap Allow on the USB debugging prompt, then try again.";
  }

  if (raw.includes("NO_ANDROID_DEVICE")) {
    return "Connect an Android phone with USB debugging enabled, or start an Android emulator, then try again.";
  }

  if (
    raw.includes("uiautomator") ||
    raw.includes("platform-tools/adb") ||
    raw.includes("device") ||
    raw.includes("emulator")
  ) {
    return "Android capture is not available. Start the emulator or connect your phone, open LiveMopay, then try again.";
  }

  if (raw.includes("No such file") || raw.includes("not found")) {
    return "The local capture tool could not start. Check that Python, ADB, and the capture script are available.";
  }

  return code === null
    ? "The local capture script stopped unexpectedly."
    : `The local capture script exited with code ${code}.`;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const args = mode === "full" ? ["capture_livemopay.py", "--full"] : ["capture_livemopay.py"];

  const stream = new ReadableStream({
    start(controller) {
      const child = spawn("python3", ["-u", ...args], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PYTHONUNBUFFERED: "1"
        },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdoutBuffer = "";
      let stderrBuffer = "";
      let sawDone = false;
      const recentLogs: string[] = [];

      controller.enqueue(
        encodeEvent({
          type: "progress",
          message: mode === "full" ? "Starting full recapture..." : "Running local capture...",
          detail: "Waiting for LiveMopay rows."
        })
      );

      child.stdout.on("data", (chunk: Buffer) => {
        stdoutBuffer += chunk.toString();
        const lines = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = lines.pop() ?? "";

        lines.filter(Boolean).forEach((line) => {
          const event = parseProgressLine(line);
          if (event.type === "done") {
            sawDone = true;
          }
          if (line.startsWith("CAPTURE_LOG: ")) {
            recentLogs.push(line.replace("CAPTURE_LOG: ", ""));
            if (recentLogs.length > 6) {
              recentLogs.shift();
            }
          }
          controller.enqueue(encodeEvent(event));
        });
      });

      child.stderr.on("data", (chunk: Buffer) => {
        stderrBuffer += chunk.toString();
      });

      child.on("error", (error) => {
        controller.enqueue(
          encodeEvent({
            type: "error",
            message: "Capture failed.",
            detail: error.message
          })
        );
        controller.close();
      });

      child.on("close", (code) => {
        if (stdoutBuffer.trim()) {
          const event = parseProgressLine(stdoutBuffer.trim());
          if (event.type === "done") {
            sawDone = true;
          }
          controller.enqueue(encodeEvent(event));
        }

        if (code === 0 && !sawDone) {
          controller.enqueue(
            encodeEvent({
              type: "done",
              message: "Capture finished.",
              detail: "CSV refreshed."
            })
          );
        }

        if (code !== 0) {
          const detail = friendlyCaptureError(stderrBuffer, code);
          controller.enqueue(
            encodeEvent({
              type: "error",
              message: "Capture failed.",
              detail: recentLogs.length ? `${detail} Last steps: ${recentLogs.join(" -> ")}` : detail
            })
          );
        }

        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store"
    }
  });
}
