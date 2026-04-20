"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { Card, CardHeader } from "@/components/ui/card";
import { filterRowsByRange } from "@/lib/analytics";
import { useFilterUrlState } from "@/lib/use-filter-url-state";
import { formatCurrency } from "@/lib/format";
import { amountClassFor, kwhDisplayFor, tariffDisplayFor } from "./row-formatting";
import { SortHeader } from "./sort-header";
import { matchesSearch, nextSortDirection, sortRows } from "./table-sorting";
import type { DataTableProps, SortDirection, SortKey } from "./types";

export function DataTable({ rows }: DataTableProps) {
  const { from, to, quickRange, onDateChange, onQuickRange } = useFilterUrlState(rows);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("captured");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    return sortRows(
      filterRowsByRange(rows, from, to).filter((row) => matchesSearch(row, query)),
      sortKey,
      sortDirection
    );
  }, [from, query, rows, sortDirection, sortKey, to]);

  function updateSort(nextKey: SortKey) {
    setSortDirection((direction) => nextSortDirection(sortKey, nextKey, direction));
    setSortKey(nextKey);
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

      <FilterBar from={from} to={to} quickRange={quickRange} onDateChange={onDateChange} onQuickRange={onQuickRange} />

      <Card>
        <CardHeader title="Transactions" eyebrow="Supabase" />
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
                const amountClass = amountClassFor(row);
                const kwhDisplay = kwhDisplayFor(row);
                const tariffDisplay = tariffDisplayFor(row);

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
