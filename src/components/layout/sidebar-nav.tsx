"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Settings as SettingsIcon, ShieldCheck, Table2 } from "lucide-react";
import { parseDateRangeQuery, filterQueryParamKeys } from "@/lib/filter-query-params";
import { queryHref } from "@/lib/url-query";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, preserveDateRange: true },
  { href: "/data", label: "Data", icon: Table2, preserveDateRange: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon, preserveDateRange: false }
] as const;

const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck, preserveDateRange: false } as const;

type SidebarNavProps = {
  isAdmin?: boolean;
  onNavigate?: () => void;
  size?: "default" | "lg";
};

// Shared between the desktop sidebar rail and the mobile menu drawer so the
// two never drift out of sync. `size="lg"` is for the mobile drawer, where
// touch targets need to be bigger than the compact desktop rail.
export function SidebarNav({ isAdmin = false, onNavigate, size = "default" }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { from, to } = parseDateRangeQuery(new URLSearchParams(searchParams.toString()));
  const dateParams = new URLSearchParams();
  const items = isAdmin ? [...navItems, adminNavItem] : navItems;
  const isLarge = size === "lg";

  if (from) {
    dateParams.set(filterQueryParamKeys.from, from);
  }

  if (to) {
    dateParams.set(filterQueryParamKeys.to, to);
  }

  return (
    <nav className={`flex flex-col ${isLarge ? "gap-2" : "gap-1"}`}>
      {items.map((item) => {
        const href = item.preserveDateRange ? queryHref(item.href, dateParams) : item.href;
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center rounded-lg transition ${isLarge ? "gap-4 px-4 py-3 text-base" : "gap-3 px-3 py-2 text-sm"} ${
              isActive ? "bg-accentSoft font-medium text-accent" : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            <Icon className={isLarge ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
