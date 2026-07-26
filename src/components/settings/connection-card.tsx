"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";

type ConnectionCardProps = {
  status: "connected" | "pending_selection" | "disconnected" | "error" | "not_connected";
  livemopayEmail: string | null;
  accountLabel: string | null;
  lastSyncedAt: string | null;
};

export function ConnectionCard({ status, livemopayEmail, accountLabel, lastSyncedAt }: ConnectionCardProps) {
  const router = useRouter();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function handleDisconnect() {
    if (!window.confirm("Disconnect your LiveMopay account? Your imported history stays available.")) {
      return;
    }

    setIsDisconnecting(true);

    try {
      await fetch("/api/livemopay/disconnect", { method: "POST" });
      router.refresh();
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader title="LiveMopay connection" eyebrow="Data source" />
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        {status === "connected" ? (
          <>
            <div className="flex items-center gap-2 text-sm text-ink">
              <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
              Connected{accountLabel ? ` to ${accountLabel}` : ""}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted">LiveMopay email</dt>
                <dd className="mt-0.5 text-ink">{livemopayEmail ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-muted">Last synced</dt>
                <dd className="mt-0.5 text-ink">
                  {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Not synced yet"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={isDisconnecting}
              className="inline-flex h-9 w-fit items-center rounded-md border border-line bg-paper px-3 text-sm text-muted transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              {status === "not_connected"
                ? "No LiveMopay account connected yet."
                : "Your LiveMopay account is disconnected. Your existing history stays available."}
            </p>
            <a
              href="/connect"
              className="inline-flex h-9 w-fit items-center rounded-md bg-ink px-4 text-sm font-medium text-paper transition hover:opacity-90"
            >
              Connect LiveMopay
            </a>
          </>
        )}
      </div>
    </Card>
  );
}
