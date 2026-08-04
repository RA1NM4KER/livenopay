import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 pt-6">
      <div className="hidden shrink-0 sm:block">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted">Manage user roles and permissions.</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="px-2 py-2 sm:px-4 sm:py-3">
              <Skeleton className="h-3 w-10 sm:w-16" />
              <Skeleton className="mt-2 h-5 w-6 sm:h-7 sm:w-10" />
            </Card>
          ))}
        </div>

        <Card className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-line bg-accentSoft text-xs uppercase tracking-[0.16em] text-brandTeal dark:text-accent shadow-[0_1px_0_rgb(var(--color-line))]">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">AI assistant</th>
                  <th className="px-4 py-3 font-medium">LiveMopay</th>
                  <th className="px-4 py-3 font-medium">Last sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {Array.from({ length: 8 }, (_, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-8 w-28" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-6 w-10 rounded-full" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
