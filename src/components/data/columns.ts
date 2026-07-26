// Single source of truth for the data table's column labels and alignment,
// shared between the real table (data-table.tsx) and its route-level
// loading skeleton (app/(app)/data/loading.tsx) so the two can never drift
// out of sync and flash a different header between load phases.
export type DataTableColumnId = "period" | "type" | "band" | "kwh" | "tariff" | "amount" | "balance" | "captured";

export type DataTableColumn = {
  id: DataTableColumnId;
  label: string;
  align: "text-left" | "text-right";
};

export const dataTableColumns: DataTableColumn[] = [
  { id: "period", label: "Period", align: "text-left" },
  { id: "type", label: "Type", align: "text-left" },
  { id: "band", label: "Band", align: "text-left" },
  { id: "kwh", label: "Usage", align: "text-right" },
  { id: "tariff", label: "Tariff", align: "text-right" },
  { id: "amount", label: "Cost / amount", align: "text-right" },
  { id: "balance", label: "Balance", align: "text-right" },
  { id: "captured", label: "Captured", align: "text-left" }
];

export const dataTableColumnLabel: Record<DataTableColumnId, string> = Object.fromEntries(
  dataTableColumns.map((column) => [column.id, column.label])
) as Record<DataTableColumnId, string>;

export const dataTableColumnAlign: Record<string, string> = Object.fromEntries(
  dataTableColumns.map((column) => [column.id, column.align])
);
