import type { DailyPoint } from "@/lib/types";

export function buildDailySpendChartModel(data: DailyPoint[]) {
  const latestDay = data[data.length - 1];
  const projectedDay =
    latestDay && !latestDay.isComplete && typeof latestDay.projectedSpend === "number" ? latestDay : undefined;
  const previousDay = projectedDay ? data[data.length - 2] : undefined;
  const completedDays = data.filter((point) => point.isComplete);
  const averageSpend = completedDays.length
    ? completedDays.reduce((sum, point) => sum + point.spend, 0) / completedDays.length
    : 0;
  const chartData = data.map((point) => ({
    ...point,
    actualSpend: projectedDay && point.date === projectedDay.date ? null : point.spend,
    currentSpend: projectedDay && point.date === projectedDay.date ? point.spend : null,
    projectedSpendValue: projectedDay && point.date === projectedDay.date ? projectedDay.projectedSpend : null
  }));
  const currentDaySegment =
    projectedDay && previousDay
      ? [
          { x: previousDay.date, y: previousDay.spend },
          { x: projectedDay.date, y: projectedDay.spend }
        ]
      : undefined;
  return {
    projectedDay,
    completedDays,
    averageSpend,
    chartData,
    currentDaySegment
  };
}
