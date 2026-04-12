import { formatCurrency, formatKwh, formatPercent, formatTariff, shortDate } from "./format";
import type { Analytics, DailyPoint, EnergyRow, HourlyPoint, Insight, TariffPoint, UsageHourPeak } from "./types";

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

function buildDaily(rows: EnergyRow[]): DailyPoint[] {
  const grouped = new Map<string, EnergyRow[]>();

  rows.forEach((row) => {
    const bucket = grouped.get(row.periodDate) ?? [];
    bucket.push(row);
    grouped.set(row.periodDate, bucket);
  });

  let cumulativeSpend = 0;

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => {
      const energyItems = items.filter((item) => item.chargeKind === "energy");
      const spendItems = items.filter((item) => item.chargeKind === "energy" || item.chargeKind === "fixed");
      const spend = sum(spendItems.map((item) => item.cost));
      const kwh = sum(energyItems.map((item) => item.kwh));
      const weightedTariff = kwh > 0 ? sum(energyItems.map((item) => item.kwh * item.tariff)) / kwh : 0;
      const energyIntervals = new Set(energyItems.map((item) => item.periodTime)).size;
      const isComplete = energyIntervals >= 48;
      const fixedSpend = sum(items.filter((item) => item.chargeKind === "fixed").map((item) => item.cost));
      const energySpend = sum(energyItems.map((item) => item.cost));
      cumulativeSpend += spend;

      return {
        date,
        spend: round(spend),
        kwh: round(kwh),
        averageTariff: round(weightedTariff),
        balance: items[items.length - 1]?.balance ?? 0,
        cumulativeSpend: round(cumulativeSpend),
        energyIntervals,
        isComplete,
        projectedSpend: !isComplete && energyIntervals > 0 ? round((energySpend / energyIntervals) * 48 + fixedSpend) : undefined,
        projectedKwh: !isComplete && energyIntervals > 0 ? round((kwh / energyIntervals) * 48) : undefined
      };
    });
}

function buildHourly(rows: EnergyRow[]): HourlyPoint[] {
  const energyRows = rows.filter((row) => row.chargeKind === "energy");

  return Array.from({ length: 24 }, (_, hour) => {
    const items = energyRows.filter((row) => row.hour === hour);

    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      spend: round(sum(items.map((item) => item.cost))),
      kwh: round(sum(items.map((item) => item.kwh))),
      intervals: items.length
    };
  });
}

function buildHighestUsageHour(rows: EnergyRow[]): UsageHourPeak | undefined {
  const grouped = new Map<string, EnergyRow[]>();

  rows
    .filter((row) => row.chargeKind === "energy")
    .forEach((row) => {
      const hour = `${String(row.hour).padStart(2, "0")}:00`;
      const key = `${row.periodDate}|${hour}`;
      const bucket = grouped.get(key) ?? [];
      bucket.push(row);
      grouped.set(key, bucket);
    });

  const hourlyPeaks = Array.from(grouped.entries()).map(([key, items]) => {
    const [date, hour] = key.split("|");

    return {
      date,
      hour,
      spend: round(sum(items.map((item) => item.cost))),
      kwh: round(sum(items.map((item) => item.kwh)))
    };
  });

  return maxBy(hourlyPeaks, (item) => item.kwh);
}

function buildTariffTimeline(rows: EnergyRow[]): TariffPoint[] {
  const energyRows = rows.filter((row) => row.chargeKind === "energy");
  const byPeriod = new Map<string, EnergyRow[]>();

  energyRows.forEach((row) => {
    const bucket = byPeriod.get(row.periodDateTime) ?? [];
    bucket.push(row);
    byPeriod.set(row.periodDateTime, bucket);
  });

  const periodPoints = Array.from(byPeriod.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, items]) => {
      const first = items[0];
      const kwh = sum(items.map((item) => item.kwh));
      const spend = sum(items.map((item) => item.cost));
      const tariffs = new Set(items.map((item) => item.tariff));
      const labels = Array.from(new Set(items.map((item) => item.chargeLabel.replace("Energy Charge: ", ""))));

      return {
        periodDateTime: first.periodDateTime,
        dateLabel: `${shortDate(first.periodDate)} ${first.periodTime}`,
        tariff: round(kwh > 0 ? spend / kwh : first.tariff),
        chargeLabel: labels.join(" / "),
        spend: round(spend),
        mixed: tariffs.size > 1
      };
    });

  const changes = periodPoints.filter(
    (point, index) =>
      index === 0 ||
      point.tariff !== periodPoints[index - 1]?.tariff ||
      point.chargeLabel !== periodPoints[index - 1]?.chargeLabel ||
      point.mixed
  );
  const lastPoint = periodPoints[periodPoints.length - 1];

  if (lastPoint && changes[changes.length - 1]?.periodDateTime !== lastPoint.periodDateTime) {
    changes.push(lastPoint);
  }

  return changes;
}

function buildDailyTariffTimeline(rows: EnergyRow[]): TariffPoint[] {
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

function buildInsights(rows: EnergyRow[], daily: DailyPoint[], hourly: HourlyPoint[], tariffTimeline: TariffPoint[]): Insight[] {
  const energyRows = rows.filter((row) => row.chargeKind === "energy");
  const fixedSpend = sum(rows.filter((row) => row.chargeKind === "fixed").map((row) => row.cost));
  const topSpendHour = maxBy(hourly, (hour) => hour.spend);
  const totalSpend = sum(hourly.map((hour) => hour.spend));
  const topHours = hourly
    .slice()
    .sort((left, right) => right.spend - left.spend)
    .slice(0, 3);
  const topHourShare = totalSpend > 0 ? sum(topHours.map((hour) => hour.spend)) / totalSpend : 0;
  const trend = previousTrend(daily);
  const highestSpendDay = maxBy(daily, (day) => day.spend);
  const highestTariff = maxBy(energyRows, (row) => row.tariff);

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
      body: `${tariffTimeline.length} tariff band changes appear in range. Highest observed tariff is ${formatTariff(highestTariff.tariff)}.`
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

export function createAnalytics(rows: EnergyRow[]): Analytics {
  const daily = buildDaily(rows);
  const hourly = buildHourly(rows);
  const tariffTimeline = buildDailyTariffTimeline(rows);
  const spendRows = rows.filter((row) => row.chargeKind === "energy" || row.chargeKind === "fixed");
  const totalSpend = round(sum(spendRows.map((row) => row.cost)));
  const energyRows = rows.filter((row) => row.chargeKind === "energy");
  const fixedRows = rows.filter((row) => row.chargeKind === "fixed");
  const totalEnergySpend = round(sum(energyRows.map((row) => row.cost)));
  const totalFixedSpend = round(sum(fixedRows.map((row) => row.cost)));
  const totalKwh = round(sum(energyRows.map((row) => row.kwh)));
  const energyCostPerKwh = totalKwh > 0 ? round(totalEnergySpend / totalKwh) : 0;
  const allInCostPerKwh = totalKwh > 0 ? round(totalSpend / totalKwh) : 0;
  const dayCount = daily.length || 1;
  const highestSpendDay = maxBy(daily, (day) => day.spend);
  const highestUsageDay = maxBy(daily, (day) => day.kwh);
  const highestUsageHour = buildHighestUsageHour(rows);
  const latest = rows[rows.length - 1];

  return {
    rows,
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
      latestBalance: latest?.balance,
      latestPeriod: latest?.periodDateTime,
      dateStart: daily[0]?.date,
      dateEnd: daily[daily.length - 1]?.date,
      dayCount
    },
    insights: buildInsights(rows, daily, hourly, tariffTimeline)
  };
}

export function filterRowsByRange(rows: EnergyRow[], from?: string, to?: string) {
  return rows.filter((row) => {
    if (from && row.periodDate < from) {
      return false;
    }

    if (to && row.periodDate > to) {
      return false;
    }

    return true;
  });
}
