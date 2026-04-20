"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { quickRangeOptions, type QuickRangePreset } from "@/lib/filters";
import type { QuickRange } from "@/lib/types";
import type { FilterBarProps, IsoDateInputProps } from "./types";

function IsoDateInput({ label, value, onChange }: IsoDateInputProps) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm text-muted sm:flex-row sm:items-center sm:gap-1.5">
      {label}
      <DatePicker label={label} onChange={onChange} value={value} />
    </label>
  );
}

type RangeDropdownProps = {
  quickRange: QuickRange;
  onQuickRange: (range: QuickRangePreset) => void;
};

function RangeDropdown({ quickRange, onQuickRange }: RangeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = useMemo(
    () =>
      quickRange === "custom"
        ? "Custom range"
        : (quickRangeOptions.find((option) => option.value === quickRange)?.label ?? "All time"),
    [quickRange]
  );

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
        }
      }}
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="inline-flex h-9 w-32 items-center justify-between rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition hover:bg-canvas focus:border-accent"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="whitespace-nowrap">{activeLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 top-[calc(100%+0.5rem)] z-40 min-w-full rounded-md border border-line bg-paper p-1 shadow-soft"
          role="listbox"
        >
          {quickRangeOptions.map((option) => {
            const isActive = option.value === quickRange;

            return (
              <button
                className={`w-full rounded px-3 py-2 text-left text-sm transition ${
                  isActive ? "bg-canvas text-ink" : "text-muted hover:bg-canvas hover:text-ink"
                }`}
                key={option.value}
                onClick={() => {
                  onQuickRange(option.value);
                  setIsOpen(false);
                }}
                aria-selected={isActive}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FilterBarContent({ from, to, quickRange, onDateChange, onQuickRange }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <RangeDropdown quickRange={quickRange} onQuickRange={onQuickRange} />
        <IsoDateInput label="From" value={from} onChange={(value) => onDateChange(value, to)} />
        <IsoDateInput label="To" value={to} onChange={(value) => onDateChange(from, value)} />
      </div>
    </div>
  );
}

export const FilterBar = (props: FilterBarProps) => <FilterBarContent {...props} />;
