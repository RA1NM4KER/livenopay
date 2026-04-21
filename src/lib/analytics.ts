import { formatCurrency, formatKwh, formatPercent, formatTariff, shortDate } from "./format";
import type {
  Analytics,
  DailyPoint,
  DailyRollupRow,
  HourlyPoint,
  HourlyRollupRow,
  Insight,
  TariffPoint,
  UsageHourPeak
} from "./types";

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function maxBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce<T | undefined>((best, item) => {
    if (!best || getValue(item) > getValue(best)) {
      return item;
    }

    return best;
  }, undefined);
}

function filterByRange<T extends { periodDate: string }>(rows: T[], from?: string, to?: string) {
  return rows.filter((row) => {
    if (from && row.periodDate < from) {
      return false;
    }

    return !(to && row.periodDate > to);
  });
}

function buildDaily(rows: DailyRollupRow[]): DailyPoint[] {
  let cumulativeSpend = 0;

  return rows
    .slice()
    .sort((left, right) => left.periodDate.localeCompare(right.periodDate))
    .map((row) => {
      cumulativeSpend += row.totalSpend;

      return {
        date: row.periodDate,
        spend: round(row.totalSpend),
        kwh: round(row.energyKwh),
        averageTariff: round(row.weightedTariff),
        balance: round(row.balanceEnd),
        cumulativeSpend: round(cumulativeSpend),
        energyIntervals: row.energyIntervals,
        isComplete: row.isComplete,
        projectedSpend:
          !row.isComplete && row.energyIntervals > 0
            ? round((row.energySpend / row.energyIntervals) * 48 + row.fixedSpend)
            : undefined,
        projectedKwh:
          !row.isComplete && row.energyIntervals > 0 ? round((row.energyKwh / row.energyIntervals) * 48) : undefined
      };
    });
}

function buildHourly(rows: HourlyRollupRow[]): HourlyPoint[] {
  const grouped = new Map<number, HourlyRollupRow[]>();

  rows.forEach((row) => {
    const bucket = grouped.get(row.hour) ?? [];
    bucket.push(row);
    grouped.set(row.hour, bucket);
  });

  return Array.from({ length: 24 }, (_, hour) => {
    const items = grouped.get(hour) ?? [];

    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      spend: round(sum(items.map((item) => item.spend))),
      kwh: round(sum(items.map((item) => item.kwh))),
      intervals: sum(items.map((item) => item.intervals))
    };
  });
}

function buildHighestUsageHour(rows: HourlyRollupRow[]): UsageHourPeak | undefined {
  const grouped = new Map<string, { spend: number; kwh: number }>();

  rows.forEach((row) => {
    const hour = `${String(row.hour).padStart(2, "0")}:00`;
    const key = `${row.periodDate}|${hour}`;
    const bucket = grouped.get(key) ?? { spend: 0, kwh: 0 };
    bucket.spend += row.spend;
    bucket.kwh += row.kwh;
    grouped.set(key, bucket);
  });

  const hourlyPeaks = Array.from(grouped.entries()).map(([key, item]) => {
    const [date, hour] = key.split("|");

    return {
      date,
      hour,
      spend: round(item.spend),
      kwh: round(item.kwh)
    };
  });

  return maxBy(hourlyPeaks, (item) => item.kwh);
}

function buildDailyTariffTimeline(rows: DailyRollupRow[]): TariffPoint[] {
  return buildDaily(rows)
    .filter((day) => day.kwh > 0)
    .map((day) => ({
      periodDateTime: `${day.date}T00:00`,
      dateLabel: day.date,
      tariff: day.averageTariff,
      chargeLabel: "Daily weighted average",
      spend: day.spend
    }));
}

function previousTrend(daily: DailyPoint[]) {
  const midpoint = Math.floor(daily.length / 2);
  const previous = daily.slice(0, midpoint);
  const recent = daily.slice(midpoint);

  if (!previous.length || !recent.length) {
    return undefined;
  }

  const previousAverage = sum(previous.map((day) => day.spend)) / previous.length;
  const recentAverage = sum(recent.map((day) => day.spend)) / recent.length;

  if (previousAverage === 0) {
    return undefined;
  }

  return ((recentAverage - previousAverage) / previousAverage) * 100;
}

function buildInsights(
  dailyRows: DailyRollupRow[],
  daily: DailyPoint[],
  hourly: HourlyPoint[],
  tariffTimeline: TariffPoint[]
): Insight[] {
  const fixedSpend = sum(dailyRows.map((day) => day.fixedSpend));
  const topSpendHour = maxBy(hourly, (hour) => hour.spend);
  const totalSpend = sum(hourly.map((hour) => hour.spend));
  const topHours = hourly
    .slice()
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 3);
  const topHourShare = totalSpend > 0 ? sum(topHours.map((hour) => hour.spend)) / totalSpend : 0;
  const trend = previousTrend(daily);
  const highestSpendDay = maxBy(daily, (day) => day.spend);
  const highestTariff = maxBy(dailyRows, (row) => row.peakTariff);

  const insights: Insight[] = [];

  if (topSpendHour) {
    insights.push({
      title: "Energy cost pressure",
      body: `${topSpendHour.hour} is your most expensive energy hour at ${formatCurrency(topSpendHour.spend)} across this range.`
    });
  }

  if (topHours.length) {
    insights.push({
      title: "Concentration",
      body: `The top three hours carry ${Math.round(topHourShare * 100)}% of spend: ${topHours.map((hour) => hour.hour).join(", ")}.`,
      tone: topHourShare > 0.4 ? "watch" : "neutral"
    });
  }

  if (typeof trend === "number") {
    insights.push({
      title: "Recent trend",
      body: `Recent daily spend is ${formatPercent(trend)} versus the previous comparable slice.`,
      tone: trend > 10 ? "watch" : trend < -10 ? "good" : "neutral"
    });
  }

  if (highestSpendDay) {
    insights.push({
      title: "Peak day",
      body: `${shortDate(highestSpendDay.date)} led spend at ${formatCurrency(highestSpendDay.spend)} from ${formatKwh(highestSpendDay.kwh)}.`
    });
  }

  if (tariffTimeline.length > 1 && highestTariff) {
    insights.push({
      title: "Tariff movement",
      body: `${tariffTimeline.length} tariff band changes appear in range. Highest observed tariff is ${formatTariff(highestTariff.peakTariff)}.`
    });
  }

  if (fixedSpend > 0) {
    insights.push({
      title: "Fixed charges",
      body: `${formatCurrency(fixedSpend)} came from daily fixed charges. This is included in spend, not kWh usage.`
    });
  }

  return insights;
}

export function createAnalytics(
  dailyRows: DailyRollupRow[],
  hourlyRows: HourlyRollupRow[],
  from?: string,
  to?: string
): Analytics {
  const filteredDailyRows = filterByRange(dailyRows, from, to);
  const filteredHourlyRows = filterByRange(hourlyRows, from, to);
  const daily = buildDaily(filteredDailyRows);
  const hourly = buildHourly(filteredHourlyRows);
  const tariffTimeline = buildDailyTariffTimeline(filteredDailyRows);
  const totalSpend = round(sum(filteredDailyRows.map((row) => row.totalSpend)));
  const totalEnergySpend = round(sum(filteredDailyRows.map((row) => row.energySpend)));
  const totalFixedSpend = round(sum(filteredDailyRows.map((row) => row.fixedSpend)));
  const totalKwh = round(sum(filteredDailyRows.map((row) => row.energyKwh)));
  const energyCostPerKwh = totalKwh > 0 ? round(totalEnergySpend / totalKwh) : 0;
  const allInCostPerKwh = totalKwh > 0 ? round(totalSpend / totalKwh) : 0;
  const dayCount = daily.length || 1;
  const highestSpendDay = maxBy(daily, (day) => day.spend);
  const highestUsageDay = maxBy(daily, (day) => day.kwh);
  const highestUsageHour = buildHighestUsageHour(filteredHourlyRows);
  const latest = filteredDailyRows[filteredDailyRows.length - 1];

  return {
    daily,
    hourly,
    tariffTimeline,
    metrics: {
      totalSpend,
      totalEnergySpend,
      totalFixedSpend,
      totalKwh,
      energyCostPerKwh,
      allInCostPerKwh,
      averageSpendPerDay: round(totalSpend / dayCount),
      averageKwhPerDay: round(totalKwh / dayCount),
      highestSpendDay,
      highestUsageDay,
      highestUsageHour,
      latestBalance: latest?.balanceEnd,
      latestPeriod: latest?.latestPeriod,
      dateStart: daily[0]?.date,
      dateEnd: daily[daily.length - 1]?.date,
      dayCount
    },
    insights: buildInsights(filteredDailyRows, daily, hourly, tariffTimeline)
  };
}
