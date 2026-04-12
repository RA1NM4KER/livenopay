import type { EnergyRow } from "./types";

export type QuickRange = "7d" | "30d" | "90d" | "all";

export function defaultRange(rows: EnergyRow[]) {
  const latest = rows[rows.length - 1]?.periodDate;
  const earliest = rows[0]?.periodDate;

  return {
    from: earliest ?? "",
    to: latest ?? "",
    quickRange: "all" as QuickRange
  };
}

export function quickRangeFromLatest(rows: EnergyRow[], range: QuickRange) {
  const latest = rows[rows.length - 1]?.periodTimestamp;

  if (!latest || range === "all") {
    return defaultRange(rows);
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const from = new Date(latest);
  from.setDate(from.getDate() - (days - 1));

  return {
    from: from.toISOString().slice(0, 10),
    to: new Date(latest).toISOString().slice(0, 10),
    quickRange: range
  };
}
