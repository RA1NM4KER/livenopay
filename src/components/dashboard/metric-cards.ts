import { formatCurrency, formatKwh, formatTariff, longDateTime, shortDate } from "@/lib/format";
import type { Analytics } from "@/lib/types";

type MetricCardItem = {
  label: string;
  value: string;
  detail?: string;
};

export function buildMetricCards(metrics: Analytics["metrics"]): MetricCardItem[] {
  return [
    {
      label: "Total spend",
      value: formatCurrency(metrics.totalSpend),
      detail: `incl. ${formatCurrency(metrics.totalFixedSpend)} fixed`
    },
    {
      label: "Total usage",
      value: formatKwh(metrics.totalKwh),
      detail: `${formatKwh(metrics.averageKwhPerDay)} per day`
    },
    {
      label: "Effective rate",
      value: formatTariff(metrics.energyCostPerKwh),
      detail: `${formatTariff(metrics.allInCostPerKwh)} incl. fixed`
    },
    {
      label: "Average spend",
      value: formatCurrency(metrics.averageSpendPerDay),
      detail: `per day, incl. ${formatCurrency(metrics.totalFixedSpend / metrics.dayCount)} fixed captured/day`
    },
    {
      label: "Latest balance",
      value: typeof metrics.latestBalance === "number" ? formatCurrency(metrics.latestBalance) : "n/a",
      detail: metrics.latestPeriod ? longDateTime(metrics.latestPeriod) : undefined
    },
    {
      label: "Highest spend day",
      value: metrics.highestSpendDay ? formatCurrency(metrics.highestSpendDay.spend) : "n/a",
      detail: metrics.highestSpendDay ? `${shortDate(metrics.highestSpendDay.date)} incl. fixed` : undefined
    },
    {
      label: "Highest usage day",
      value: metrics.highestUsageDay ? formatKwh(metrics.highestUsageDay.kwh) : "n/a",
      detail: metrics.highestUsageDay ? shortDate(metrics.highestUsageDay.date) : undefined
    },
    {
      label: "Highest usage hour",
      value: metrics.highestUsageHour ? formatKwh(metrics.highestUsageHour.kwh) : "n/a",
      detail: metrics.highestUsageHour
        ? `${metrics.highestUsageHour.date} ${metrics.highestUsageHour.hour} · ${formatCurrency(metrics.highestUsageHour.spend)} energy only`
        : undefined
    }
  ];
}
