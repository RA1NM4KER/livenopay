import type { EnergyRow, Insight, QuickRange } from "@/lib/types";

export type DashboardShellProps = {
  rows: EnergyRow[];
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
  onQuickRange: (range: QuickRange) => void;
};

export type CaptureResult = {
  type?: "progress" | "done" | "error" | "log";
  message: string;
  detail?: string;
};
