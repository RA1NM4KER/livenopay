import { readFile } from "fs/promises";
import path from "path";
import type { EnergyRow } from "./types";

const CSV_PATH = path.join(process.cwd(), "livemopay_energy.csv");

type RawCsvRow = Record<string, string>;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(text: string): RawCsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "");

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<RawCsvRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function parseCaptureDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);

  if (!match) {
    return new Date(value);
  }

  const [, day, month, year, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function parsePeriodDate(value: string) {
  return new Date(value.replace(" ", "T"));
}

function toNumber(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toEnergyRow(row: RawCsvRow): EnergyRow {
  const periodDt = parsePeriodDate(row.period_dt);
  const captureDt = parseCaptureDate(row.capture_dt);
  const periodDateTime = row.period_dt.replace(" ", "T");
  const chargeKind = row.charge_label.startsWith("Energy Charge:")
    ? "energy"
    : row.charge_label === "Top Up"
      ? "topup"
      : "fixed";

  return {
    chargeKind,
    captureTimestamp: captureDt.getTime(),
    captureDateTime: row.capture_dt,
    ledgerTimestamp: chargeKind === "topup" ? periodDt.getTime() : captureDt.getTime(),
    chargeLabel: row.charge_label,
    periodTimestamp: periodDt.getTime(),
    periodDateTime,
    periodDate: periodDateTime.slice(0, 10),
    periodTime: periodDateTime.slice(11, 16),
    hour: periodDt.getHours(),
    kwh: toNumber(row.kwh),
    tariff: toNumber(row.tariff),
    cost: toNumber(row.cost),
    balance: toNumber(row.balance)
  };
}

export async function loadEnergyRows() {
  const csv = await readFile(CSV_PATH, "utf8");

  return parseCsv(csv)
    .map(toEnergyRow)
    .sort((left, right) => left.periodTimestamp - right.periodTimestamp);
}
