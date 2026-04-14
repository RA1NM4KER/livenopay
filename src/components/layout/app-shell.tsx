import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import type { AppShellProps } from "./types";

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5 sm:items-center">
        <Link href="/" className="group min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted sm:tracking-[0.26em]">Livenopay</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">Electricity ledger</h1>
        </Link>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <nav className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line bg-paper p-1 text-sm text-muted sm:flex-none">
            <Link
              className="flex-1 rounded-md px-3 py-2 text-center transition hover:bg-canvas hover:text-ink sm:flex-none"
              href="/"
            >
              Dashboard
            </Link>
            <Link
              className="flex-1 rounded-md px-3 py-2 text-center transition hover:bg-canvas hover:text-ink sm:flex-none"
              href="/data"
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
