import type { DailyRollupRow, DashboardSummary, HourlyRollupRow, Insight, QuickRange } from "@/lib/types";
import type { QuickRangePreset } from "@/lib/filters";
import type { ReactNode } from "react";

export type DashboardShellProps = {
  dailyRows: DailyRollupRow[];
  hourlyRows: HourlyRollupRow[];
  summary: DashboardSummary;
};

export type InsightsProps = {
  insights: Insight[];
};

export type IsoDateInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export type FilterBarProps = {
  from: string;
  to: string;
  quickRange: QuickRange;
  onDateChange: (from: string, to: string) => void;
  onQuickRange: (range: QuickRangePreset) => void;
  extraControls?: ReactNode;
  rightControls?: ReactNode;
};
