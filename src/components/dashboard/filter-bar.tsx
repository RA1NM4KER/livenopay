"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { quickRangeOptions, type QuickRangePreset } from "@/lib/filters";
import type { QuickRange } from "@/lib/types";
import type { FilterBarProps, IsoDateInputProps } from "./types";

function IsoDateInput({ label, value, onChange, buttonClassName }: IsoDateInputProps & { buttonClassName?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm text-muted sm:flex-row sm:items-center sm:gap-1.5">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <DatePicker label={label} onChange={onChange} value={value} buttonClassName={buttonClassName} />
    </label>
  );
}

type RangeDropdownProps = {
  quickRange: QuickRange;
  onQuickRange: (range: QuickRangePreset) => void;
};

function RangeDropdown({ quickRange, onQuickRange, className }: RangeDropdownProps & { className?: string }) {
  return (
    <DropdownSelect
      ariaLabel="Date range"
      value={quickRange}
      options={quickRangeOptions}
      fallbackLabel="Custom range"
      onChange={(value) => onQuickRange(value as QuickRangePreset)}
      className={className ?? "w-36"}
    />
  );
}

function FilterBarContent({
  from,
  to,
  quickRange,
  onDateChange,
  onQuickRange,
  extraControls,
  rightControls
}: FilterBarProps) {
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-3">
      {/* Mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <RangeDropdown quickRange={quickRange} onQuickRange={onQuickRange} className="w-full" />
          </div>
          <IsoDateInput
            label="From"
            value={from}
            onChange={(value) => onDateChange(value, to)}
            buttonClassName="h-8 px-2 gap-1.5 text-xs"
          />
          <IsoDateInput
            label="To"
            value={to}
            onChange={(value) => onDateChange(from, value)}
            buttonClassName="h-8 px-2 gap-1.5 text-xs"
          />
        </div>
        {(extraControls ?? rightControls) ? (
          <div className="flex items-center gap-2">
            {extraControls}
            {rightControls ? <div className="min-w-0 flex-1">{rightControls}</div> : null}
          </div>
        ) : null}
      </div>

      {/* Desktop */}
      <div className="hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <RangeDropdown quickRange={quickRange} onQuickRange={onQuickRange} />
          <IsoDateInput label="From" value={from} onChange={(value) => onDateChange(value, to)} />
          <IsoDateInput label="To" value={to} onChange={(value) => onDateChange(from, value)} />
          {extraControls}
        </div>
        {rightControls ? <div className="ml-auto">{rightControls}</div> : null}
      </div>
    </div>
  );
}

export const FilterBar = (props: FilterBarProps) => <FilterBarContent {...props} />;
