import type { ReactNode } from "react";

export type AppShellProps = {
  children: ReactNode;
  mobileHeaderActions?: ReactNode;
  lockViewport?: boolean;
};

export type ThemeChoice = "system" | "light" | "dark";
