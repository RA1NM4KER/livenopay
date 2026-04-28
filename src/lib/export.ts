import { utils, write } from "xlsx";
import type { EnergyRow } from "./types";

type ExportRow = Record<string, string | number>;

function toExportRows(rows: EnergyRow[]): ExportRow[] {
  return rows.map((row) => ({
    Period: row.periodDateTime.replace("T", " "),
    Type: row.chargeKind,
    Band: row.chargeLabel,
    kWh: row.kwh,
    "Tariff (R/kWh)": row.tariff,
    "Cost (R)": row.cost,
    "Balance (R)": row.balance,
    Captured: row.captureDateTime
  }));
}

function escapeCSV(value: string | number): string {
  const str = String(value ?? "");
  return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str.replace(/"/g, '""')}"` : str;
}

export function toCSVString(rows: EnergyRow[]): string {
  const exportRows = toExportRows(rows);
  const headers = Object.keys(exportRows[0] ?? {});
  const lines = [headers.join(","), ...exportRows.map((row) => headers.map((h) => escapeCSV(row[h] ?? "")).join(","))];
  return lines.join("\n");
}

export function toXLSXBuffer(rows: EnergyRow[]): Buffer {
  const ws = utils.json_to_sheet(toExportRows(rows));
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Energy rows");
  return write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
