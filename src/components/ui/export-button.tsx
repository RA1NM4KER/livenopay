"use client";

import { useState } from "react";
import { Download, ChevronDown } from "lucide-react";

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

export function ExportButton({ from, to, chargeType, search, sort, dir }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  function buildUrl(format: string) {
    const params = new URLSearchParams();
    params.set("format", format);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (chargeType && chargeType !== "all") params.set("chargeType", chargeType);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    if (dir) params.set("dir", dir);
    return `/api/export?${params.toString()}`;
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
        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition hover:bg-canvas focus:border-accent"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <Download aria-hidden="true" className="h-4 w-4 text-muted" />
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
            <a
              className="flex w-full items-center rounded px-3 py-2 text-left text-sm text-muted transition hover:bg-canvas hover:text-ink"
              download
              href={buildUrl(value)}
              key={value}
              onClick={() => setIsOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
