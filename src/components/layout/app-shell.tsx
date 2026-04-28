"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { parseDateRangeQuery, filterQueryParamKeys } from "@/lib/filter-query-params";
import { queryHref } from "@/lib/url-query";
import { ThemeToggle } from "./theme-toggle";
import type { AppShellProps } from "./types";

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { from, to } = parseDateRangeQuery(new URLSearchParams(searchParams.toString()));
  const sharedDateParams = new URLSearchParams();

  if (from) {
    sharedDateParams.set(filterQueryParamKeys.from, from);
  }

  if (to) {
    sharedDateParams.set(filterQueryParamKeys.to, to);
  }

  const dashboardHref = queryHref("/", sharedDateParams);
  const dataHref = queryHref("/data", sharedDateParams);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pt-2 sm:px-6 sm:pt-2 sm:pb-5 lg:px-8">
      <header className="flex flex-wrap items-end justify-between border-b border-line">
        <Link href={dashboardHref} className="group flex min-w-0 items-center">
          <Image
            src="/logo.png"
            alt="Electricity Ledger"
            height={300}
            width={300}
            unoptimized
            className="h-20 w-auto flex-shrink-0 dark:hidden sm:h-24"
          />
          <Image
            src="/logo-dark.png"
            alt="Electricity Ledger"
            height={300}
            width={300}
            unoptimized
            className="hidden h-20 w-auto flex-shrink-0 dark:block sm:h-24"
          />
        </Link>
        <div className="flex w-full items-end justify-between sm:w-auto sm:justify-start sm:gap-12">
          <nav className="-mb-px flex items-center gap-1 text-sm">
            <Link
              href={dashboardHref}
              className={`px-3 py-4 border-b-2 transition-colors ${
                pathname === "/" ? "border-accent text-ink font-medium" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href={dataHref}
              className={`px-3 py-4 border-b-2 transition-colors ${
                pathname === "/data"
                  ? "border-accent text-ink font-medium"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              Data
            </Link>
          </nav>
          <div className="self-center pb-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
