import { formatKwh, formatTariff } from "@/lib/format";
import type { EnergyRow } from "@/lib/types";

export function amountClassFor(row: EnergyRow) {
  if (row.chargeKind === "topup") {
    return "font-medium text-success";
  }

  if (row.chargeKind === "fixed") {
    return "font-medium text-fixed";
  }

  return "text-ink";
}

export function kwhDisplayFor(row: EnergyRow) {
  return row.chargeKind === "energy" ? formatKwh(row.kwh) : "--";
}

export function tariffDisplayFor(row: EnergyRow) {
  return row.chargeKind === "energy" ? formatTariff(row.tariff) : "--";
}
