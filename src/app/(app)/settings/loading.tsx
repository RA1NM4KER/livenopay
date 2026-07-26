import { ThemeToggle } from "@/components/layout/theme-toggle";
import { DeleteAccountCard } from "@/components/settings/delete-account-card";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Settings</h1>

      <Card>
        <CardHeader title="LiveMopay connection" eyebrow="Data source" />
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="mt-1 h-9 w-28" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Account" eyebrow="Sign-in" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-9 w-20" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Appearance" eyebrow="Display" />
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <p className="text-sm text-muted">Choose how NewinMeter looks on this device.</p>
          <ThemeToggle />
        </div>
      </Card>

      <DeleteAccountCard />
    </div>
  );
}
