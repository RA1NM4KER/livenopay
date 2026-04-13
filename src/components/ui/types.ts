import type { ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
  className?: string;
};

export type CardHeaderProps = {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
};

export type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
};
