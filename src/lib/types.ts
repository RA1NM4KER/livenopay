export type EnergyRow = {
  chargeKind: "energy" | "fixed" | "topup";
  captureTimestamp: number;
  captureDateTime: string;
  ledgerTimestamp: number;
  chargeLabel: string;
  periodTimestamp: number;
  periodDateTime: string;
  periodDate: string;
  periodTime: string;
  hour: number;
  kwh: number;
  tariff: number;
  cost: number;
  balance: number;
};

export type DailyPoint = {
  date: string;
  spend: number;
  kwh: number;
  averageTariff: number;
  balance: number;
  cumulativeSpend: number;
  energyIntervals: number;
  isComplete: boolean;
  projectedSpend?: number;
  projectedKwh?: number;
};

export type HourlyPoint = {
  hour: string;
  spend: number;
  kwh: number;
  intervals: number;
};

export type UsageHourPeak = {
  date: string;
  hour: string;
  spend: number;
  kwh: number;
};

export type TariffPoint = {
  periodDateTime: string;
  dateLabel: string;
  tariff: number;
  chargeLabel: string;
  spend: number;
  mixed?: boolean;
};

export type Metric = {
  label: string;
  value: string;
  detail?: string;
};

export type Insight = {
  title: string;
  body: string;
  tone?: "neutral" | "good" | "watch";
};

export type Analytics = {
  rows: EnergyRow[];
  daily: DailyPoint[];
  hourly: HourlyPoint[];
  tariffTimeline: TariffPoint[];
  metrics: {
    totalSpend: number;
    totalEnergySpend: number;
    totalFixedSpend: number;
    totalKwh: number;
    energyCostPerKwh: number;
    allInCostPerKwh: number;
    averageSpendPerDay: number;
    averageKwhPerDay: number;
    highestSpendDay?: DailyPoint;
    highestUsageDay?: DailyPoint;
    highestUsageHour?: UsageHourPeak;
    latestBalance?: number;
    latestPeriod?: string;
    dateStart?: string;
    dateEnd?: string;
    dayCount: number;
  };
  insights: Insight[];
};
