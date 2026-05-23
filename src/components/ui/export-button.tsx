"use client";

import { useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { buildExportUrl } from "@/lib/endpoints";

export type ExportButtonProps = {
  from?: string;
  to?: string;
  chargeType?: string;
  search?: string;
  sort?: string;
  dir?: string;
};

const formats = [
  { value: "csv", label: "Download CSV" },
  { value: "xlsx", label: "Download XLSX" }
] as const;

function filenameFromDisposition(header: string | null) {
  if (!header) {
    return null;
  }

  const match =
    /filename\*=UTF-8''([^;]+)/i.exec(header) || /filename="([^"]+)"/i.exec(header) || /filename=([^;]+)/i.exec(header);
  const raw = match?.[1];

  if (!raw) {
    return null;
  }

  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

export function ExportButton({ from, to, chargeType, search, sort, dir }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function buildUrl(format: string) {
    const params = new URLSearchParams();
    params.set("format", format);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (chargeType && chargeType !== "all") params.set("chargeType", chargeType);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);
    return buildExportUrl(params);
  }

  async function handleExport(format: string) {
    setIsLoading(true);
    setIsOpen(false);
    const url = buildUrl(format);

    try {
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(body || "Export failed.");
      }

      const blob = await response.blob();
      const fallbackName = `electricity-ledger.${format}`;
      const filename = filenameFromDisposition(response.headers.get("content-disposition")) ?? fallbackName;
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
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
        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition hover:bg-canvas focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        {isLoading ? (
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-muted" />
        ) : (
          <Download aria-hidden="true" className="h-4 w-4 text-muted" />
        )}
        <span>Export</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-40 min-w-[10rem] rounded-md border border-line bg-paper p-1 shadow-soft"
          role="listbox"
          aria-label="Export format"
        >
          {formats.map(({ value, label }) => (
            <button
              className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
              key={value}
              onClick={() => void handleExport(value)}
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
