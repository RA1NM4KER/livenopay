import type { ReactNode } from "react";
import type { DailyPoint, EnergyRow, HourlyPoint, TariffPoint } from "@/lib/types";

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
  rows: EnergyRow[];
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
