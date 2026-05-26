"use client";

import { useState } from "react";
import { ChevronDown, Loader2, RefreshCw } from "lucide-react";

export type SyncButtonProps = {
  iconOnly?: boolean;
  className?: string;
  onSuccess?: () => void | Promise<void>;
};

const syncModes = [
  { value: "incremental", label: "Sync new rows" },
  { value: "full", label: "Full resync" }
] as const;

export function SyncButton({ iconOnly = false, className, onSuccess }: SyncButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSync(mode: (typeof syncModes)[number]["value"]) {
    if (mode === "full" && !window.confirm("Run a full LiveMopay resync? This will refetch the full range.")) {
      return;
    }

    setIsLoading(true);
    setIsOpen(false);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ mode })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "Sync failed.");
      }

      await onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false);
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-busy={isLoading}
        className={`inline-flex h-9 items-center gap-2 rounded-md border border-line bg-paper text-sm text-ink outline-none transition hover:bg-canvas focus:border-accent disabled:cursor-not-allowed disabled:opacity-60 ${
          iconOnly ? "px-2" : "px-3"
        } ${className ?? ""}`}
        disabled={isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        {isLoading ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted" />
        ) : (
          <RefreshCw aria-hidden="true" className="h-4 w-4 text-muted" />
        )}
        {iconOnly ? <span className="sr-only">Sync</span> : <span>Sync</span>}
        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div
          className="absolute left-1/2 top-[calc(100%+0.5rem)] z-40 min-w-[8rem] -translate-x-1/2 rounded-md border border-line bg-paper p-1 shadow-soft"
          role="listbox"
          aria-label="Sync options"
        >
          {syncModes.map(({ value, label }) => (
            <button
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              key={value}
              onClick={() => void handleSync(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
