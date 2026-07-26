import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/layout/wordmark";

type AuthShellProps = {
  badge?: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
};

export function AuthShell({ badge, title, description, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-neutral-950 px-6 pb-0 pt-8 sm:pt-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(0,255,155,0.14),transparent_70%)]"
      />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        <Wordmark className="text-xl" />

        {badge ? (
          <div className="mt-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/70">
            {badge}
          </div>
        ) : null}

        <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">{description}</p>

        <div className="mt-7 w-full max-w-sm">{children}</div>

        <p className="mt-6 max-w-sm text-xs text-white/35">
          A community dashboard for Newinbosch residents, independent of Newinbosch HOA, Livewire, and LiveMopay.
        </p>

        <p className="mt-3 text-xs text-white/35">
          By continuing, you agree to our{" "}
          <Link className="text-white/55 hover:text-white/80" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="text-white/55 hover:text-white/80" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <div className="relative mt-8 w-full max-w-5xl">
        <div className="overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-neutral-900 shadow-[0_-30px_80px_rgba(0,255,155,0.05)]">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          </div>
          <Image
            src="/dashboard-preview.png"
            alt="A NewinMeter dashboard showing electricity and water spend, usage, and daily cost charts"
            width={2000}
            height={1097}
            unoptimized
            className="block w-full"
          />
        </div>
      </div>
    </div>
  );
}
