"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { quickRangeOptions, type QuickRangePreset } from "@/lib/filters";
import type { QuickRange } from "@/lib/types";
import type { FilterBarProps, IsoDateInputProps } from "./types";

function IsoDateInput({
  label,
  value,
  onChange,
  buttonClassName,
  loading
}: IsoDateInputProps & { buttonClassName?: string; loading?: boolean }) {
  return (
    <label className="relative flex min-w-0">
      <span className="pointer-events-none absolute left-3 top-0 z-10 -translate-y-1/2 bg-paper px-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-muted/80">
        {label}
      </span>
      <DatePicker
        label={label}
        loading={loading}
        onChange={onChange}
        value={value}
        buttonClassName={buttonClassName}
      />
    </label>
  );
}

type RangeDropdownProps = {
  quickRange: QuickRange;
  onQuickRange: (range: QuickRangePreset) => void;
  loading?: boolean;
};

function RangeDropdown({ quickRange, onQuickRange, loading, className }: RangeDropdownProps & { className?: string }) {
  return (
    <DropdownSelect
      ariaLabel="Date range"
      value={quickRange}
      options={quickRangeOptions}
      fallbackLabel="Custom range"
      onChange={(value) => onQuickRange(value as QuickRangePreset)}
      loading={loading}
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
  loading = false,
  leftControls,
  extraControls,
  rightControls,
  rightControlsExpanded = false
}: FilterBarProps) {
  return (
    <div className="rounded-lg border border-line bg-paper px-3 py-3">
      {/* Mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        <div className="flex items-center gap-2">
          {leftControls}
          <div className="min-w-0 flex-1">
            <RangeDropdown quickRange={quickRange} onQuickRange={onQuickRange} loading={loading} className="w-full" />
          </div>
          <IsoDateInput
            label="From"
            value={from}
            onChange={(value) => onDateChange(value, to)}
            buttonClassName="h-8 px-2 gap-1.5 text-xs"
            loading={loading}
          />
          <IsoDateInput
            label="To"
            value={to}
            onChange={(value) => onDateChange(from, value)}
            buttonClassName="h-8 px-2 gap-1.5 text-xs"
            loading={loading}
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
          {leftControls}
          <RangeDropdown quickRange={quickRange} onQuickRange={onQuickRange} loading={loading} />
          <IsoDateInput label="From" value={from} onChange={(value) => onDateChange(value, to)} loading={loading} />
          <IsoDateInput label="To" value={to} onChange={(value) => onDateChange(from, value)} loading={loading} />
          {extraControls}
        </div>
        {rightControls ? (
          <div className={rightControlsExpanded ? "ml-auto w-full max-w-[19.5rem]" : "ml-auto"}>{rightControls}</div>
        ) : null}
      </div>
    </div>
  );
}

export const FilterBar = (props: FilterBarProps) => <FilterBarContent {...props} />;
