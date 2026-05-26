"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type DropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: ReactNode;
};

type DropdownSelectProps = {
  ariaLabel: string;
  value: string;
  options: DropdownOption[];
  onChange(value: string): void;
  fallbackLabel?: string;
  className?: string;
  menuPlacement?: "bottom" | "top";
  hideLabelOnMobile?: boolean;
};

export function DropdownSelect({
  ariaLabel,
  value,
  options,
  onChange,
  fallbackLabel,
  className = "w-36",
  menuPlacement = "bottom",
  hideLabelOnMobile = false
}: DropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeOption = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);
  const activeLabel = activeOption?.label ?? fallbackLabel ?? value;
  const activeIcon = activeOption?.icon;
  const triggerLabelClassName = hideLabelOnMobile ? "sr-only sm:not-sr-only" : undefined;
  const layoutClassName = hideLabelOnMobile ? "justify-center gap-2 sm:justify-between sm:gap-0" : "justify-between";

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
        aria-label={ariaLabel}
        className={`inline-flex h-9 items-center ${layoutClassName} rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none transition hover:bg-canvas focus:border-accent ${className}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {activeIcon ? <span className="shrink-0">{activeIcon}</span> : null}
          <span className={triggerLabelClassName}>{activeLabel}</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div
          className={`absolute left-1/2 z-40 min-w-full -translate-x-1/2 rounded-md border border-line bg-paper p-1 shadow-soft ${
            menuPlacement === "top" ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"
          }`}
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => {
            const isActive = option.value === value;

            return (
              <button
                aria-selected={isActive}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition ${
                  option.disabled
                    ? "cursor-not-allowed text-muted/60"
                    : isActive
                      ? "bg-canvas text-ink"
                      : "text-muted hover:bg-canvas hover:text-ink"
                } ${hideLabelOnMobile ? "justify-center gap-0 sm:justify-start sm:gap-2" : ""}`}
                disabled={option.disabled}
                key={option.value}
                onClick={() => {
                  if (option.disabled) {
                    return;
                  }

                  onChange(option.value);
                  setIsOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.icon ? <span className="shrink-0">{option.icon}</span> : null}
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
