import type { ReactNode } from "react";
import type { DailyPoint, DailyRollupRow, HourlyPoint, TariffPoint } from "@/lib/types";
import type { DayBreakdownDomains } from "@/lib/day-breakdown";

export type ChartShellProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  footer?: ReactNode;
  fullScreenChildren?: ReactNode;
  children: ReactNode;
};

export type DailyChartProps = {
  data: DailyPoint[];
};

export type HourlyChartProps = {
  data: HourlyPoint[];
  metric: "spend" | "kwh";
  title: string;
};

export type TariffChartProps = {
  data: TariffPoint[];
};

export type DayBreakdownChartProps = {
  initialSelectedDate?: string;
  dateOptions: string[];
  dailyRows: DailyRollupRow[];
  globalDomains?: DayBreakdownDomains;
};

export type ProjectedBarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type DaySummaryCardProps = {
  label: string;
  value: string;
};
