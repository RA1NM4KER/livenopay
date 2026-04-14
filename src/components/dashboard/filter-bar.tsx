"use client";

import { DatePicker } from "@/components/ui/date-picker";
import type { QuickRange } from "@/lib/types";
import type { FilterBarProps, IsoDateInputProps } from "./types";

const ranges: QuickRange[] = ["7d", "30d", "90d", "all"];

function IsoDateInput({ label, value, onChange }: IsoDateInputProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-muted sm:flex-none sm:flex-row sm:items-center">
      {label}
      <DatePicker label={label} onChange={onChange} value={value} />
    </label>
  );
}

export function FilterBar({ from, to, quickRange, onDateChange, onQuickRange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="grid grid-cols-4 rounded-md bg-canvas p-1 sm:flex">
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
      <div className="flex w-full gap-2 sm:w-auto sm:contents">
        <IsoDateInput label="From" value={from} onChange={(value) => onDateChange(value, to)} />
        <IsoDateInput label="To" value={to} onChange={(value) => onDateChange(from, value)} />
      </div>
    </div>
  );
}
