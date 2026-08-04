"use client";

import { useState } from "react";
import { ChevronDown, FileDown } from "lucide-react";
import { apiEndpoints } from "@/lib/endpoints";

const formats = [
  { value: "csv", label: "Download CSV" },
  { value: "xlsx", label: "Download XLSX" }
] as const;

export function ActivityExportButton({ params }: { params: URLSearchParams }) {
  const [isOpen, setIsOpen] = useState(false);

  function exportUrl(format: (typeof formats)[number]["value"]) {
    const exportParams = new URLSearchParams(params);
    exportParams.set("format", format);
    return `${apiEndpoints.activityExport}?${exportParams.toString()}`;
  }

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setIsOpen(false);
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition hover:bg-white/15"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <FileDown aria-hidden="true" className="h-4 w-4 shrink-0 text-white/70" />
        <span className="shrink-0">Export</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-white/70 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          aria-label="Activity export format"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-[10rem] rounded-md border border-line bg-paper p-1 shadow-soft"
          role="menu"
        >
          {formats.map((format) => (
            <a
              className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-muted transition hover:bg-canvas hover:text-ink"
              download
              href={exportUrl(format.value)}
              key={format.value}
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              {format.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
