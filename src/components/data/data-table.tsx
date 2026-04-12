"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { filterRowsByRange } from "@/lib/analytics";
import { defaultRange, quickRangeFromLatest, type QuickRange } from "@/lib/filters";
import { formatCurrency, formatKwh, formatTariff } from "@/lib/format";
import type { EnergyRow } from "@/lib/types";
import { FilterBar } from "@/components/dashboard/filter-bar";

type SortKey = "period" | "type" | "band" | "kwh" | "tariff" | "amount" | "balance" | "captured";
type SortDirection = "asc" | "desc";

function matchesSearch(row: EnergyRow, query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [row.captureDateTime, row.chargeLabel, row.periodDateTime, row.periodTime]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

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

function compareValues(left: number | string, right: number | string) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function SortHeader({
  label,
  sortKey,
  align = "left",
  activeKey,
  direction,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  align?: "left" | "right";
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
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

export function DataTable({ rows }: { rows: EnergyRow[] }) {
  const initialRange = useMemo(() => defaultRange(rows), [rows]);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [quickRange, setQuickRange] = useState<QuickRange>(initialRange.quickRange);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("captured");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    const accessor = sortAccessors[sortKey];

    return filterRowsByRange(rows, from, to)
      .filter((row) => matchesSearch(row, query))
      .slice()
      .sort((left, right) => {
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
  }, [from, query, rows, sortDirection, sortKey, to]);

  function updateSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "type" || nextKey === "band" ? "asc" : "desc");
  }

  function updateDates(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setQuickRange("all");
  }

  function updateQuickRange(range: QuickRange) {
    const nextRange = quickRangeFromLatest(rows, range);
    setFrom(nextRange.from);
    setTo(nextRange.to);
    setQuickRange(nextRange.quickRange);
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{filtered.length} rows</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Raw energy rows</h2>
        </div>
        <label className="w-full max-w-sm text-sm text-muted">
          Search
          <input
            className="mt-2 h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus:border-accent"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Date, band, time"
            value={query}
          />
        </label>
      </div>

      <FilterBar
        from={from}
        to={to}
        quickRange={quickRange}
        onDateChange={updateDates}
        onQuickRange={updateQuickRange}
      />

      <Card>
        <CardHeader title="Transactions" eyebrow="CSV" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="border-b border-line bg-canvas text-xs uppercase tracking-[0.16em] text-muted">
              <tr>
                <SortHeader
                  label="Period"
                  sortKey="period"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="Type"
                  sortKey="type"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="Band"
                  sortKey="band"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="kWh"
                  sortKey="kwh"
                  align="right"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="Tariff"
                  sortKey="tariff"
                  align="right"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="Cost / amount"
                  sortKey="amount"
                  align="right"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="Balance"
                  sortKey="balance"
                  align="right"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
                <SortHeader
                  label="Captured"
                  sortKey="captured"
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={updateSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((row) => {
                const amountClass =
                  row.chargeKind === "topup"
                    ? "font-medium text-[#2f8f46]"
                    : row.chargeKind === "fixed"
                      ? "font-medium text-[#2f6fa3]"
                      : "text-ink";
                const kwhDisplay = row.chargeKind === "energy" ? formatKwh(row.kwh) : "--";
                const tariffDisplay = row.chargeKind === "energy" ? formatTariff(row.tariff) : "--";

                return (
                  <tr
                    className="transition hover:bg-canvas/70"
                    key={`${row.periodDateTime}-${row.balance}-${row.cost}`}
                  >
                    <td className="px-4 py-3 font-medium text-ink">{row.periodDateTime.replace("T", " ")}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-canvas px-2 py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                        {row.chargeKind}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{row.chargeLabel.replace("Energy Charge: ", "")}</td>
                    <td className="px-4 py-3 text-right text-ink">{kwhDisplay}</td>
                    <td className="px-4 py-3 text-right text-muted">{tariffDisplay}</td>
                    <td className={`px-4 py-3 text-right ${amountClass}`}>{formatCurrency(row.cost)}</td>
                    <td className="px-4 py-3 text-right text-muted">{formatCurrency(row.balance)}</td>
                    <td className="px-4 py-3 text-muted">{row.captureDateTime}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
