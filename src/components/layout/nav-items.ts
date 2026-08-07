import { Activity, Gauge, LayoutDashboard, Settings as SettingsIcon, ShieldCheck, Table2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  preserveDateRange: boolean;
  isNew?: boolean;
};

export type NavPermissions = {
  isAdmin?: boolean;
  isActivitiesEnabled?: boolean;
  isLiveMeterEnabled?: boolean;
};

// Live sits right after Dashboard: it's the second most immediate "what's my
// house doing" surface. Rolling telemetry, so it never carries a date range.
const liveNavItem: NavItem = { href: "/live", label: "Live", icon: Gauge, preserveDateRange: false };

const dashboardItem: NavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard, preserveDateRange: true };
const tailItems: NavItem[] = [
  { href: "/data", label: "Data", icon: Table2, preserveDateRange: true },
  { href: "/activities", label: "Activities", icon: Activity, preserveDateRange: true, isNew: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon, preserveDateRange: false }
];

const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: ShieldCheck, preserveDateRange: false };

// Single source of truth for which nav entries a given user sees, so the
// desktop rail and the mobile drawer can never drift. Gated features
// (Live, Activities) are OMITTED entirely when disabled -- never rendered
// disabled or as a teaser -- so a user without the permission has no way to
// even discover the feature exists.
export function buildNavItems(permissions: NavPermissions): NavItem[] {
  const items: NavItem[] = [dashboardItem];

  if (permissions.isLiveMeterEnabled) {
    items.push(liveNavItem);
  }

  for (const item of tailItems) {
    if (item.href === "/activities" && !permissions.isActivitiesEnabled) {
      continue;
    }
    items.push(item);
  }

  if (permissions.isAdmin) {
    items.push(adminNavItem);
  }

  return items;
}
