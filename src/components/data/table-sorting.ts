import type { EnergyRow } from "@/lib/types";
import type { SortDirection, SortKey } from "./types";

const sortAccessors: Record<SortKey, (row: EnergyRow) => number | string> = {
  period: (row) => row.periodTimestamp,
  type: (row) => row.chargeKind,
  band: (row) => row.chargeLabel,
  kwh: (row) => row.kwh,
  tariff: (row) => row.tariff,
  amount: (row) => row.cost,
  balance: (row) => row.balance,
  captured: (row) => row.captureTimestamp
};

export function matchesSearch(row: EnergyRow, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [row.captureDateTime, row.chargeLabel, row.periodDateTime, row.periodTime]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

export function sortRows(rows: EnergyRow[], sortKey: SortKey, sortDirection: SortDirection) {
  const accessor = sortAccessors[sortKey];

  return rows.slice().sort((left, right) => {
    const primary = compareValues(accessor(left), accessor(right));
    const directed = sortDirection === "asc" ? primary : -primary;

    if (directed !== 0) {
      return directed;
    }

    if (right.ledgerTimestamp !== left.ledgerTimestamp) {
      return right.ledgerTimestamp - left.ledgerTimestamp;
    }

    return right.periodTimestamp - left.periodTimestamp;
  });
}

export function nextSortDirection(sortKey: SortKey, nextKey: SortKey, currentDirection: SortDirection) {
  if (nextKey === sortKey) {
    return currentDirection === "asc" ? "desc" : "asc";
  }

  return nextKey === "type" || nextKey === "band" ? "asc" : "desc";
}

function compareValues(left: number | string, right: number | string) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}
