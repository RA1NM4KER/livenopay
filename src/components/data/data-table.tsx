"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { DropdownSelect, type DropdownOption } from "@/components/ui/dropdown-select";
import { ExportButton } from "@/components/ui/export-button";
import { Card } from "@/components/ui/card";
import { type ChargeTypeFilter } from "@/lib/data-table-query-params";
import { useDataTableUrlState } from "@/lib/use-data-table-url-state";
import { formatCurrency } from "@/lib/format";
import type { EnergyRow } from "@/lib/types";
import { amountClassFor, kwhDisplayFor, tariffDisplayFor } from "./row-formatting";
import type { SortDirection, SortKey } from "./types";

const chargeTypeLabelMap: Record<EnergyRow["chargeKind"], string> = {
  energy: "Energy",
  fixed: "Fixed",
  topup: "Top up"
};

const SEARCH_DEBOUNCE_MS = 250;
const pageSizeOptions: DropdownOption[] = [
  { label: "25 / page", value: "25" },
  { label: "50 / page", value: "50" },
  { label: "100 / page", value: "100" }
];

type EnergyRowsApiResponse = {
  rows: EnergyRow[];
  total: number;
  page: number;
  pageSize: number;
  bounds: {
    from: string;
    to: string;
  };
};

const columnAlignClass: Record<string, string> = {
  kwh: "text-right",
  tariff: "text-right",
  amount: "text-right",
  balance: "text-right"
};

function nextSortLabel(direction: SortDirection, active: boolean) {
  if (!active) {
    return <ArrowUpDown aria-hidden="true" className="ml-1 h-3.5 w-3.5 text-muted/55" />;
  }

  return direction === "asc" ? (
    <ArrowUp aria-hidden="true" className="ml-1 h-3.5 w-3.5 text-ink" />
  ) : (
    <ArrowDown aria-hidden="true" className="ml-1 h-3.5 w-3.5 text-ink" />
  );
}

async function fetchEnergyRows(params: URLSearchParams) {
  const response = await fetch(`/api/energy-rows?${params.toString()}`, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to load energy rows.");
  }

  return (await response.json()) as EnergyRowsApiResponse;
}

export function DataTable() {
  const {
    from,
    to,
    quickRange,
    chargeType,
    searchQuery,
    page,
    pageSize,
    sortKey,
    sortDirection,
    onDateChange,
    onQuickRange,
    onChargeTypeChange,
    onSearchChange,
    onSortChange,
    onPageChange,
    onPageSizeChange
  } = useDataTableUrlState();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    if (chargeType !== "all") {
      params.set("chargeType", chargeType);
    }

    if (searchQuery) {
      params.set("search", searchQuery);
    }

    if (sortKey !== "captured") {
      params.set("sort", sortKey);
    }

    if (sortDirection !== "desc") {
      params.set("dir", sortDirection);
    }

    if (page > 1) {
      params.set("page", String(page));
    }

    if (pageSize !== 50) {
      params.set("pageSize", String(pageSize));
    }

    return params;
  }, [chargeType, from, page, pageSize, searchQuery, sortDirection, sortKey, to]);

  const { data, isFetching, isLoading, error } = useQuery({
    queryKey: ["energy-rows", queryParams.toString()],
    queryFn: () => fetchEnergyRows(queryParams),
    placeholderData: keepPreviousData
  });

  const rows = data?.rows ?? [];
  const totalRows = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const displayFrom = from || data?.bounds.from || "";
  const displayTo = to || data?.bounds.to || "";
  const isAllTimeBoundsSelected =
    Boolean(data?.bounds.from) && Boolean(data?.bounds.to) && from === data?.bounds.from && to === data?.bounds.to;
  const effectiveQuickRange = quickRange === "custom" && isAllTimeBoundsSelected ? "allTime" : quickRange;

  const handleQuickRangeChange = (
    range: "pastWeek" | "pastMonth" | "past3Months" | "thisMonth" | "thisWeek" | "allTime"
  ) => {
    if (range === "allTime") {
      const allTimeFrom = data?.bounds.from || "";
      const allTimeTo = data?.bounds.to || "";

      if (allTimeFrom && allTimeTo) {
        onDateChange(allTimeFrom, allTimeTo);
        return;
      }
    }

    onQuickRange(range);
  };

  const columns = useMemo<ColumnDef<EnergyRow>[]>(
    () => [
      {
        id: "period",
        accessorFn: (row) => row.periodDateTime,
        header: "Period",
        cell: ({ row }) => <span className="font-medium text-ink">{row.original.periodDateTime.replace("T", " ")}</span>
      },
      {
        id: "type",
        accessorFn: (row) => row.chargeKind,
        header: "Type",
        cell: ({ row }) => (
          <span className="rounded bg-canvas px-2 py-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
            {row.original.chargeKind}
          </span>
        )
      },
      {
        id: "band",
        accessorFn: (row) => row.chargeLabel,
        header: "Band",
        cell: ({ row }) => <span className="text-muted">{row.original.chargeLabel.replace("Energy Charge: ", "")}</span>
      },
      {
        id: "kwh",
        accessorFn: (row) => row.kwh,
        header: "kWh",
        cell: ({ row }) => <span className="text-ink">{kwhDisplayFor(row.original)}</span>
      },
      {
        id: "tariff",
        accessorFn: (row) => row.tariff,
        header: "Tariff",
        cell: ({ row }) => <span className="text-muted">{tariffDisplayFor(row.original)}</span>
      },
      {
        id: "amount",
        accessorFn: (row) => row.cost,
        header: "Cost / amount",
        cell: ({ row }) => <span className={amountClassFor(row.original)}>{formatCurrency(row.original.cost)}</span>
      },
      {
        id: "balance",
        accessorFn: (row) => row.balance,
        header: "Balance",
        cell: ({ row }) => <span className="text-muted">{formatCurrency(row.original.balance)}</span>
      },
      {
        id: "captured",
        accessorFn: (row) => row.captureDateTime,
        header: "Captured",
        cell: ({ row }) => <span className="text-muted">{row.original.captureDateTime}</span>
      }
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    state: {
      pagination: {
        pageIndex: Math.max(0, page - 1),
        pageSize
      },
      sorting: [
        {
          id: sortKey,
          desc: sortDirection === "desc"
        }
      ]
    }
  });

  const chargeTypeOptions = useMemo<DropdownOption[]>(() => {
    return [
      { label: "All types", value: "all" },
      { label: chargeTypeLabelMap.energy, value: "energy" },
      { label: chargeTypeLabelMap.fixed, value: "fixed" },
      { label: chargeTypeLabelMap.topup, value: "topup" }
    ];
  }, []);

  const chargeTypeFilterControl = (
    <DropdownSelect
      ariaLabel="Charge type"
      value={chargeType}
      options={chargeTypeOptions}
      onChange={(value) => onChargeTypeChange(value as ChargeTypeFilter)}
      className="w-28"
    />
  );

  const searchFilterControl = (
    <div className="relative w-full sm:w-52">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        aria-label="Search rows"
        className="h-9 w-full rounded-md border border-line bg-paper pl-9 pr-3 text-sm text-ink outline-none focus:border-accent"
        value={searchInput}
        onBlur={(event) => {
          if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = null;
          }

          onSearchChange(event.currentTarget.value);
        }}
        onChange={(event) => {
          const nextValue = event.target.value;
          setSearchInput(nextValue);

          if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
          }

          searchDebounceRef.current = setTimeout(() => {
            onSearchChange(nextValue);
          }, SEARCH_DEBOUNCE_MS);
        }}
        placeholder="Search"
      />
    </div>
  );

  const totalLabel = isLoading ? "Loading rows..." : `${totalRows} rows`;
  const hasPreviousPage = page > 1;
  const hasNextPage = page < pageCount;

  useEffect(() => {
    const boundsFrom = data?.bounds.from || "";
    const boundsTo = data?.bounds.to || "";

    if (from || to || !boundsFrom || !boundsTo) {
      return;
    }

    onDateChange(boundsFrom, boundsTo);
  }, [data?.bounds.from, data?.bounds.to, from, onDateChange, to]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pt-6 ">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="hidden text-sm text-muted sm:block">{totalLabel}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Raw energy rows</h2>
        </div>
        <ExportButton
          from={displayFrom}
          to={displayTo}
          chargeType={chargeType !== "all" ? chargeType : undefined}
          search={searchQuery || undefined}
          sort={sortKey !== "captured" ? sortKey : undefined}
          dir={sortDirection !== "desc" ? sortDirection : undefined}
        />
      </div>

      <FilterBar
        from={displayFrom}
        to={displayTo}
        quickRange={effectiveQuickRange}
        onDateChange={onDateChange}
        onQuickRange={handleQuickRangeChange}
        extraControls={chargeTypeFilterControl}
        rightControls={searchFilterControl}
      />

      <Card className="flex h-[66vh] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-line bg-canvas text-xs uppercase tracking-[0.16em] text-muted shadow-[0_1px_0_rgb(var(--color-line))]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const id = header.column.id as SortKey;
                    const alignClass = columnAlignClass[id] ?? "text-left";
                    const isActive = sortKey === id;

                    return (
                      <th className={`px-4 py-3 ${alignClass}`} key={header.id}>
                        <button
                          className="inline-flex items-center font-medium uppercase tracking-[0.16em]"
                          onClick={() => onSortChange(id)}
                          type="button"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {nextSortLabel(sortDirection, isActive)}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-line">
              {table.getRowModel().rows.map((row) => (
                <tr className="transition hover:bg-canvas/70" key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const alignClass = columnAlignClass[cell.column.id] ?? "text-left";

                    return (
                      <td className={`px-4 py-3 ${alignClass}`} key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            Page {Math.min(page, pageCount)} of {pageCount}
            {isFetching && !isLoading ? " \u00b7 updating..." : ""}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownSelect
              ariaLabel="Rows per page"
              value={String(pageSize)}
              options={pageSizeOptions}
              onChange={(value) => onPageSizeChange(Number(value))}
              menuPlacement="top"
              className="w-32"
            />
            <button
              className="inline-flex h-9 items-center rounded-md border border-line bg-paper px-3 text-sm text-muted transition enabled:hover:bg-canvas enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasPreviousPage}
              onClick={() => onPageChange(page - 1)}
              type="button"
            >
              Previous
            </button>
            <button
              className="inline-flex h-9 items-center rounded-md border border-line bg-paper px-3 text-sm text-muted transition enabled:hover:bg-canvas enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasNextPage}
              onClick={() => onPageChange(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>

        {error instanceof Error ? <p className="px-3 py-2 text-sm text-red-500">{error.message}</p> : null}
      </Card>
    </div>
  );
}
