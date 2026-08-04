import type { DailyPoint, UsageActivity } from "@/lib/types";

export function groupActivitiesByDate(activities: UsageActivity[]) {
  return activities.reduce<Record<string, UsageActivity[]>>((grouped, activity) => {
    const date = activity.startsAt.slice(0, 10);
    (grouped[date] ??= []).push(activity);
    return grouped;
  }, {});
}

export function buildDailyKwhChartModel(data: DailyPoint[]) {
  const chartData = data.map((point) => ({
    ...point,
    projectedKwhRemainder:
      typeof point.projectedKwh === "number" && point.projectedKwh > point.kwh ? point.projectedKwh - point.kwh : 0
  }));
  const completedDays = data.filter((point) => point.isComplete);
  const averageKwh = completedDays.length
    ? completedDays.reduce((sum, point) => sum + point.kwh, 0) / completedDays.length
    : 0;

  return { chartData, completedDays, averageKwh };
}
