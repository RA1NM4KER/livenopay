import { formatCurrency, formatKl, formatKwh, formatTariff, longDateTime, shortDate } from "@/lib/format";
import { percentChange } from "@/lib/period-comparison";
import type { Analytics } from "@/lib/types";

type MetricCardItem = {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "watch" | "danger";
  comparison?: {
    text: string;
    tone: "neutral" | "good" | "watch" | "danger";
  };
};

function getBalanceTone(balance: number) {
  if (balance >= 700) {
    return "good" as const;
  }

  if (balance >= 300) {
    return "watch" as const;
  }

  return "danger" as const;
}

function buildComparison(
  current: number,
  previous: number | undefined,
  higherIsBetter: boolean
): MetricCardItem["comparison"] {
  if (typeof previous !== "number") {
    return undefined;
  }

  const change = percentChange(current, previous);
  if (change === null || change === 0) {
    return undefined;
  }

  const rounded = Math.abs(change) >= 10 ? Math.round(Math.abs(change)) : Math.round(Math.abs(change) * 10) / 10;
  const favorable = higherIsBetter ? change > 0 : change < 0;
  const tone = favorable ? "good" : Math.abs(change) >= 10 ? "danger" : "watch";

  return {
    text: `${change > 0 ? "↑" : "↓"} ${rounded}%`,
    tone
  };
}

export function buildMetricCards(
  metrics: Analytics["metrics"],
  previousMetrics?: Analytics["metrics"]
): MetricCardItem[] {
  const cards: MetricCardItem[] = [
    {
      label: "Total spend",
      value: formatCurrency(metrics.totalSpend),
      detail:
        metrics.totalWaterSpend > 0
          ? `${formatCurrency(metrics.totalFixedSpend)} fixed • ${formatCurrency(metrics.totalWaterSpend)} water`
          : `incl. ${formatCurrency(metrics.totalFixedSpend)} fixed`,
      comparison: buildComparison(metrics.totalSpend, previousMetrics?.totalSpend, false)
    },
    {
      label: "Total usage",
      value: formatKwh(metrics.totalKwh),
      detail:
        metrics.totalWaterKl > 0
          ? `${formatKwh(metrics.averageKwhPerDay)} electricity/day`
          : `${formatKwh(metrics.averageKwhPerDay)} per day`,
      comparison: buildComparison(metrics.totalKwh, previousMetrics?.totalKwh, false)
    },
    {
      label: "Electricity rate",
      value: formatTariff(metrics.energyCostPerKwh),
      detail: `${formatTariff(metrics.allInCostPerKwh)} incl. fixed`
    },
    {
      label: "Average spend",
      value: formatCurrency(metrics.averageSpendPerDay),
      detail: `per day, incl. ${formatCurrency(metrics.totalFixedSpend / metrics.dayCount)} fixed`,
      comparison: buildComparison(metrics.averageSpendPerDay, previousMetrics?.averageSpendPerDay, false)
    },
    {
      label: "Latest balance",
      value: typeof metrics.latestBalance === "number" ? formatCurrency(metrics.latestBalance) : "n/a",
      detail: metrics.latestPeriod ? longDateTime(metrics.latestPeriod) : undefined,
      tone: typeof metrics.latestBalance === "number" ? getBalanceTone(metrics.latestBalance) : "neutral"
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
        ? `${metrics.highestUsageHour.date} ${metrics.highestUsageHour.hour} · ${formatCurrency(metrics.highestUsageHour.spend)}`
        : undefined
    }
  ];

  if (metrics.totalWaterSpend > 0 || metrics.totalWaterKl > 0) {
    cards.splice(2, 0, {
      label: "Water spend",
      value: formatCurrency(metrics.totalWaterSpend),
      detail: formatKl(metrics.totalWaterKl)
    });

    cards.splice(3, 0, {
      label: "Water usage",
      value: formatKl(metrics.totalWaterKl),
      detail: `${formatKl(metrics.averageWaterKlPerDay)} per day`
    });
  }

  return cards;
}
