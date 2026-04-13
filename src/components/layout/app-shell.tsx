import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import type { AppShellProps } from "./types";

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <Link href="/" className="group">
          <p className="text-xs font-medium uppercase tracking-[0.26em] text-muted">Livenopay</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Electricity ledger</h1>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex items-center gap-2 rounded-lg border border-line bg-paper p-1 text-sm text-muted">
            <Link className="rounded-md px-3 py-2 transition hover:bg-canvas hover:text-ink" href="/">
              Dashboard
            </Link>
            <Link className="rounded-md px-3 py-2 transition hover:bg-canvas hover:text-ink" href="/data">
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
