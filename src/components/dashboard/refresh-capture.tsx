"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CaptureResult = {
  type?: "progress" | "done" | "error" | "log";
  message: string;
  detail?: string;
};

export function RefreshCapture() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [toast, setToast] = useState<{ title: string; detail?: string; tone: "neutral" | "error" } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  async function runCapture(mode: "incremental" | "full" = "incremental") {
    setStatus("running");
    setMenuOpen(false);
    setToast({
      title: mode === "full" ? "Starting full recapture..." : "Running local capture...",
      detail: "Waiting for LiveMopay rows.",
      tone: "neutral"
    });

    try {
      const response = await fetch(`/api/capture${mode === "full" ? "?mode=full" : ""}`, { method: "POST" });

      if (!response.ok || !response.body) {
        throw new Error("Capture failed to start.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalEvent: CaptureResult | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        lines.filter(Boolean).forEach((line) => {
          const event = JSON.parse(line) as CaptureResult;

          if (event.type === "error") {
            finalEvent = event;
            setStatus("error");
            setToast({ title: event.message, detail: event.detail, tone: "error" });
            return;
          }

          if (event.type === "done") {
            finalEvent = event;
          }

          if (event.type === "progress" || event.type === "done") {
            setToast({ title: event.message, detail: event.detail, tone: "neutral" });
          }
        });
      }

      if (buffer.trim()) {
        finalEvent = JSON.parse(buffer) as CaptureResult;
      }

      if (finalEvent?.type === "error") {
        setStatus("error");
        setToast({ title: finalEvent.message, detail: finalEvent.detail, tone: "error" });
        return;
      }

      setStatus("done");
      if (finalEvent?.type === "done") {
        setToast({ title: finalEvent.message, detail: finalEvent.detail, tone: "neutral" });
      }
      router.refresh();
    } catch (error) {
      setStatus("error");
      setToast({
        title: "Capture failed.",
        detail: error instanceof Error ? error.message : "The local capture script could not run.",
        tone: "error"
      });
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-3">
      <div className="relative flex w-48">
        <button
          className="flex-1 rounded-l-md border border-ink bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-[#35332d] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "running"}
          onClick={() => runCapture("incremental")}
          type="button"
        >
          {status === "running" ? "Capturing..." : "Refresh capture"}
        </button>
        <button
          aria-expanded={menuOpen}
          aria-label="Capture options"
          className="inline-flex items-center rounded-r-md border border-l-paper/20 border-ink bg-ink px-3 py-2 text-sm font-medium text-paper transition hover:bg-[#35332d] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "running"}
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {menuOpen ? (
          <div className="absolute left-0 right-0 top-11 z-40 rounded-lg border border-line bg-paper p-1 shadow-soft">
            <button
              className="block w-full rounded-md px-3 py-3 text-left transition hover:bg-canvas"
              onClick={() => runCapture("full")}
              type="button"
            >
              <span className="block text-sm font-medium text-ink">Full recapture</span>
              <span className="mt-1 block text-xs leading-5 text-muted">Ignore existing rows and rebuild the CSV.</span>
            </button>
          </div>
        ) : null}
      </div>
      {toast ? (
        <div
          className={`fixed right-4 top-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-soft ${
            toast.tone === "error" ? "border-[#d6b8b0] bg-roseSoft" : "border-line bg-paper"
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{toast.title}</p>
              {toast.detail ? <p className="mt-1 text-sm text-muted">{toast.detail}</p> : null}
            </div>
            <button
              aria-label="Dismiss capture message"
              className="rounded px-2 py-1 text-sm text-muted transition hover:bg-canvas hover:text-ink"
              onClick={() => setToast(null)}
              type="button"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
