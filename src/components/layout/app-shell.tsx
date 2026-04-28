"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseDateRangeQuery, filterQueryParamKeys } from "@/lib/filter-query-params";
import { queryHref } from "@/lib/url-query";
import { ThemeToggle } from "./theme-toggle";
import type { AppShellProps } from "./types";

export function AppShell({ children }: AppShellProps) {
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
      <header className="flex flex-wrap items-center justify-between border-b border-line">
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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <nav className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-paper p-1 text-sm text-muted sm:flex-none">
            <Link
              className="flex-1 rounded-md px-3 py-2 text-center transition hover:bg-canvas hover:text-ink sm:flex-none"
              href={dashboardHref}
            >
              Dashboard
            </Link>
            <Link
              className="flex-1 rounded-md px-3 py-2 text-center transition hover:bg-canvas hover:text-ink sm:flex-none"
              href={dataHref}
            >
              Data
            </Link>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      {children}
    </main>
  );
}
