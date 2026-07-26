import type { ReactNode } from "react";

export type AppShellProps = {
  children: ReactNode;
  userEmail?: string | null;
  isAdmin?: boolean;
};

export type ThemeChoice = "system" | "light" | "dark";
