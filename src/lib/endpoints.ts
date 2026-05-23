const apiBase = "/api";

export const apiEndpoints = {
  assistant: `${apiBase}/assistant`,
  dayIntervals: `${apiBase}/day-intervals`,
  energyRows: `${apiBase}/energy-rows`,
  export: `${apiBase}/export`
} as const;

export function buildDayIntervalsUrl(periodDate: string) {
  return `${apiEndpoints.dayIntervals}?periodDate=${encodeURIComponent(periodDate)}`;
}

export function buildEnergyRowsUrl(params: URLSearchParams) {
  return `${apiEndpoints.energyRows}?${params.toString()}`;
}

export function buildExportUrl(params: URLSearchParams) {
  return `${apiEndpoints.export}?${params.toString()}`;
}
