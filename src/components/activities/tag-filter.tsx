"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { displayActivityTag } from "@/lib/activity-utils";

export function TagFilter({
  tags,
  selected,
  onChange
}: {
  tags: string[];
  selected: string[];
  onChange(tags: string[]): void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => detailsRef.current?.removeAttribute("open");
    const handlePointerDown = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <details className="group relative" ref={detailsRef}>
      <summary className="flex h-9 shrink-0 cursor-pointer list-none items-center justify-between gap-2 whitespace-nowrap rounded-md border border-white/15 bg-white/10 px-3 text-sm text-white outline-none [&::-webkit-details-marker]:hidden">
        <span>{selected.length ? `${selected.length} tag${selected.length === 1 ? "" : "s"}` : "All tags"}</span>
        <ChevronDown className="h-4 w-4 text-white/70 transition group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 top-[calc(100%+0.5rem)] z-40 max-h-64 min-w-48 overflow-auto rounded-md border border-line bg-paper p-2 shadow-soft">
        {!tags.length ? (
          <p className="px-2 py-2 text-sm text-muted">No tags yet</p>
        ) : (
          tags.map((tag) => {
            const checked = selected.includes(tag);
            return (
              <label
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-muted hover:bg-canvas hover:text-ink"
                key={tag}
              >
                <input
                  checked={checked}
                  className="accent-[rgb(var(--color-accent))]"
                  onChange={() => onChange(checked ? selected.filter((item) => item !== tag) : [...selected, tag])}
                  type="checkbox"
                />
                {displayActivityTag(tag)}
              </label>
            );
          })
        )}
        {selected.length ? (
          <button
            className="mt-1 w-full border-t border-line px-2 pt-2 text-left text-xs text-muted hover:text-ink"
            onClick={() => onChange([])}
            type="button"
          >
            Clear tags
          </button>
        ) : null}
      </div>
    </details>
  );
}
