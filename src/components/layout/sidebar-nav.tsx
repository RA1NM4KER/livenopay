"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, LayoutDashboard, Settings as SettingsIcon, ShieldCheck, Table2 } from "lucide-react";
import { parseDateRangeQuery, filterQueryParamKeys } from "@/lib/filter-query-params";
import { queryHref } from "@/lib/url-query";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, preserveDateRange: true },
  { href: "/data", label: "Data", icon: Table2, preserveDateRange: true },
  { href: "/activities", label: "Activities", icon: Activity, preserveDateRange: true, isNew: true },
  { href: "/settings", label: "Settings", icon: SettingsIcon, preserveDateRange: false }
] as const;

const ACTIVITIES_SEEN_KEY = "activities-nav-seen";

const adminNavItem = { href: "/admin", label: "Admin", icon: ShieldCheck, preserveDateRange: false } as const;

type SidebarNavProps = {
  isAdmin?: boolean;
  isActivitiesEnabled?: boolean;
  onNavigate?: () => void;
  size?: "default" | "lg";
};

// Shared between the desktop sidebar rail and the mobile menu drawer so the
// two never drift out of sync. `size="lg"` is for the mobile drawer, where
// touch targets need to be bigger than the compact desktop rail.
export function SidebarNav({ isAdmin = false, isActivitiesEnabled = false, onNavigate, size = "default" }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { from, to } = parseDateRangeQuery(new URLSearchParams(searchParams.toString()));
  const dateParams = new URLSearchParams();
  // Activities is a per-user opt-in while it's being tested with one person
  // -- everyone else simply doesn't see the entry point.
  const items = (isAdmin ? [...navItems, adminNavItem] : navItems).filter(
    (item) => item.href !== "/activities" || isActivitiesEnabled
  );
  const isLarge = size === "lg";
  // Defaults to hidden, not shown -- the server has no localStorage to
  // check, so defaulting to "shown" would flash the badge on every refresh
  // for someone who already dismissed it. Starting hidden means a returning
  // visitor never sees it at all; a genuinely new visitor sees it appear a
  // beat after mount instead, which is the far less jarring direction.
  const [showActivitiesBadge, setShowActivitiesBadge] = useState(false);

  useEffect(() => {
    if (pathname === "/activities") {
      localStorage.setItem(ACTIVITIES_SEEN_KEY, "1");
      return;
    }

    if (!localStorage.getItem(ACTIVITIES_SEEN_KEY)) {
      setShowActivitiesBadge(true);
    }
  }, [pathname]);

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
            className={`flex items-center rounded-lg transition ${isLarge ? "gap-3 px-3 py-2 text-base" : "gap-2.5 px-2.5 py-1.5 text-sm"} ${
              isActive ? "bg-paper font-medium text-ink shadow-sm" : "text-muted hover:bg-paper/60 hover:text-ink"
            }`}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-full transition ${isLarge ? "h-9 w-9" : "h-7 w-7"} ${
                isActive ? "bg-brandTeal text-white" : "text-muted"
              }`}
            >
              <Icon className={isLarge ? "h-5 w-5" : "h-4 w-4"} aria-hidden="true" />
            </span>
            {item.label}
            {"isNew" in item && item.isNew && showActivitiesBadge ? (
              <span className="ml-auto rounded-full border border-accent/30 bg-accentSoft px-2 py-0.5 text-[0.65rem] font-medium tracking-wide text-accent">
                New
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
