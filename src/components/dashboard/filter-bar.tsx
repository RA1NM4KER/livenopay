"use client";

import type { QuickRange } from "@/lib/types";
import type { FilterBarProps, IsoDateInputProps } from "./types";

const ranges: QuickRange[] = ["7d", "30d", "90d", "all"];

function IsoDateInput({ label, value, onChange }: IsoDateInputProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      {label}
      <span className="relative inline-flex h-9 w-44 items-center justify-between rounded-md border border-line bg-paper px-3 text-sm text-ink transition focus-within:border-accent">
        <span>{value}</span>
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 3v3M17 3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          />
        </svg>
        <input
          aria-label={label}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={value}
        />
      </span>
    </label>
  );
}

export function FilterBar({ from, to, quickRange, onDateChange, onQuickRange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper px-3 py-3">
      <div className="flex rounded-md bg-canvas p-1">
        {ranges.map((range) => (
          <button
            className={`rounded px-3 py-1.5 text-sm transition ${
              quickRange === range ? "bg-paper text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
            key={range}
            onClick={() => onQuickRange(range)}
            type="button"
          >
            {range}
          </button>
        ))}
      </div>
      <IsoDateInput label="From" value={from} onChange={(value) => onDateChange(value, to)} />
      <IsoDateInput label="To" value={to} onChange={(value) => onDateChange(from, value)} />
    </div>
  );
}
