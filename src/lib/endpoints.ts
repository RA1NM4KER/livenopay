const apiBase = "/api";

export const apiEndpoints = {
  adminUsers: `${apiBase}/admin/users`,
  activities: `${apiBase}/activities`,
  activityReport: `${apiBase}/activity-report`,
  activityExport: `${apiBase}/activity-export`,
  assistant: `${apiBase}/assistant`,
  dayIntervals: `${apiBase}/day-intervals`,
  energyRows: `${apiBase}/energy-rows`,
  export: `${apiBase}/export`,
  liveOverview: `${apiBase}/live/overview`,
  sync: `${apiBase}/sync`
} as const;

export function buildLiveOverviewUrl(window: string) {
  return `${apiEndpoints.liveOverview}?window=${encodeURIComponent(window)}`;
}

export function buildDayIntervalsUrl(periodDate: string) {
  return `${apiEndpoints.dayIntervals}?periodDate=${encodeURIComponent(periodDate)}`;
}

export function buildEnergyRowsUrl(params: URLSearchParams) {
  return `${apiEndpoints.energyRows}?${params.toString()}`;
}

export function buildActivitiesUrl(params?: URLSearchParams) {
  return params?.size ? `${apiEndpoints.activities}?${params.toString()}` : apiEndpoints.activities;
}

export function buildActivityReportUrl(params: URLSearchParams) {
  return `${apiEndpoints.activityReport}?${params.toString()}`;
}
