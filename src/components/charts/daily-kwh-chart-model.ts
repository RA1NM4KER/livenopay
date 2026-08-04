import type { DailyPoint } from "@/lib/types";

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
