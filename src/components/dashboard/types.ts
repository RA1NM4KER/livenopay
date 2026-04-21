import type { EnergyRow, Insight, QuickRange, SyncMetadata } from "@/lib/types";
import type { QuickRangePreset } from "@/lib/filters";
import type { ReactNode } from "react";

export type DashboardShellProps = {
  rows: EnergyRow[];
  sync: SyncMetadata;
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
