import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardHeader } from "@/components/ui/card";
import { BadgePermissionCard } from "@/components/settings/badge-permission-card";
import { ConnectionCard } from "@/components/settings/connection-card";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { getAuthenticatedSession } from "@/lib/auth/session";
import { getConnectionForUser } from "@/lib/newinmeter-connection";

export const dynamic = "force-dynamic";

// Unlike the dashboard/data pages, Settings is reachable even without an
// active connection -- someone who disconnected still needs a place to
// reconnect, check their account, or sign out.
export default async function SettingsPage() {
  const session = await getAuthenticatedSession();
  if (!session) {
    redirect("/login");
  }

  const connection = await getConnectionForUser(session.userId);

  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Settings</h1>

      <ConnectionCard
        status={connection?.status ?? "not_connected"}
        livemopayEmail={connection?.livemopayEmail ?? null}
        accountLabel={connection?.accountLabel ?? null}
        lastSyncedAt={connection?.lastSyncedAt ?? null}
      />

      <Card>
        <CardHeader title="Account" eyebrow="Sign-in" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p className="text-sm text-ink">{session.email}</p>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-line bg-paper px-3 text-sm text-muted transition hover:bg-canvas hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" eyebrow="Display" />
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p className="text-sm text-muted">Choose how NewinMeter looks on this device.</p>
          <ThemeToggle />
        </div>
      </Card>

      <BadgePermissionCard lastSyncedAt={connection?.lastSyncedAt ?? null} />

      <DeleteAccountCard />
    </div>
  );
}
