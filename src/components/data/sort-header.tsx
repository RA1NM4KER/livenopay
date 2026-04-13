import type { SortHeaderProps } from "./types";

export function SortHeader({ label, sortKey, align = "left", activeKey, direction, onSort }: SortHeaderProps) {
  const active = activeKey === sortKey;

  return (
    <th className={`px-4 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        className={`inline-flex items-center gap-1 rounded text-xs uppercase tracking-[0.16em] transition hover:text-ink ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
        onClick={() => onSort(sortKey)}
        type="button"
      >
        <span>{label}</span>
        <span className={`${active ? "text-ink" : "text-muted/60"}`}>
          {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}
