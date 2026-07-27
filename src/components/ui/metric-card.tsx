"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MetricCardProps } from "./types";

const toneStyles = {
  neutral: "",
  good: "",
  watch: "",
  danger: ""
} as const;

const valueToneStyles = {
  neutral: "",
  good: "text-accent",
  watch: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400"
} as const;

const comparisonToneStyles = {
  neutral: "text-muted",
  good: "text-accent",
  watch: "text-amber-700 dark:text-amber-400",
  danger: "text-red-700 dark:text-red-400"
} as const;

export function MetricCard({ label, value, detail, description, tone = "neutral", comparison }: MetricCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLElement | null>(null);

  const toggle = () => setIsExpanded((previous) => !previous);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  return (
    <section
      aria-expanded={description ? isExpanded : undefined}
      className={`relative min-w-0 rounded-lg border border-line bg-paper p-4 text-left ${
        description ? "cursor-pointer" : ""
      } ${toneStyles[tone]}`}
      onClick={description ? toggle : undefined}
      onKeyDown={
        description
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle();
              }
            }
          : undefined
      }
      ref={containerRef}
      role={description ? "button" : undefined}
      tabIndex={description ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <div className="flex shrink-0 items-center gap-2">
          {comparison ? (
            <p className={`text-xs font-medium ${comparisonToneStyles[comparison.tone]}`}>{comparison.text}</p>
          ) : null}
          {description ? (
            <ChevronDown
              aria-hidden="true"
              className={`h-3.5 w-3.5 text-muted/60 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            />
          ) : null}
        </div>
      </div>
      <div className="mt-3">
        <p className={`break-words text-xl font-semibold tracking-tight sm:text-2xl ${valueToneStyles[tone]}`}>
          {value}
        </p>
      </div>
      {detail ? <p className="mt-2 break-words text-xs text-muted">{detail}</p> : null}

      {isExpanded && description ? (
        // Deliberately in normal flow, not `absolute` -- the mobile card
        // rail scrolls with overflow-x-auto, which forces overflow-y to
        // clip too (a standing CSS rule: any non-"visible" overflow-x
        // makes overflow-y compute to "auto"), so an absolutely
        // positioned popup escaping the card's own box got cut off there.
        <div className="mt-3 rounded-lg border border-line bg-paper p-3 text-xs text-muted shadow-soft">
          {description}
        </div>
      ) : null}
    </section>
  );
}
