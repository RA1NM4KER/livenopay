"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { DropdownSelect } from "@/components/ui/dropdown-select";
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
  return (
    <DropdownSelect
      ariaLabel="Date range"
      value={quickRange}
      options={quickRangeOptions}
      fallbackLabel="Custom range"
      onChange={(value) => onQuickRange(value as QuickRangePreset)}
      className="w-36"
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
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-paper px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <RangeDropdown quickRange={quickRange} onQuickRange={onQuickRange} />
        <IsoDateInput label="From" value={from} onChange={(value) => onDateChange(value, to)} />
        <IsoDateInput label="To" value={to} onChange={(value) => onDateChange(from, value)} />
        {extraControls}
      </div>
      {rightControls ? <div className="w-full sm:ml-auto sm:w-auto">{rightControls}</div> : null}
    </div>
  );
}

export const FilterBar = (props: FilterBarProps) => <FilterBarContent {...props} />;
