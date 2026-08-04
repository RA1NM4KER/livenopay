"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { removeActivity } from "@/lib/activity-client";
import { activityTimeLabel } from "@/lib/activity-utils";
import { formatCurrency, formatKwh } from "@/lib/format";
import type { ActivityReportRow, UsageActivity } from "@/lib/types";
import { ActivityTagChip } from "./tag-chip";

export function ActivityList({
  activities,
  onEdit
}: {
  activities: Array<UsageActivity | ActivityReportRow>;
  onEdit(activity: UsageActivity): void;
}) {
  const queryClient = useQueryClient();
  const deletion = useMutation({
    mutationFn: removeActivity,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["activity-report"] }),
        queryClient.invalidateQueries({ queryKey: ["activity-tags"] })
      ]);
    }
  });

  if (!activities.length)
    return (
      <p className="rounded-md border border-dashed border-line px-3 py-5 text-center text-sm text-muted">
        No activities recorded for this day.
      </p>
    );

  const sorted = [...activities].sort(
    (left, right) => Number(right.allDay) - Number(left.allDay) || left.startsAt.localeCompare(right.startsAt)
  );
  const isReportRow = (activity: UsageActivity | ActivityReportRow): activity is ActivityReportRow =>
    "electricityKwh" in activity;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((activity) => (
        <article className="flex min-h-32 flex-col rounded-lg border border-line bg-canvas/35 p-3.5" key={activity.id}>
          <div className="flex items-start justify-between gap-3">
            <p className="pt-1 text-sm font-semibold text-ink">{activityTimeLabel(activity)}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="Edit activity"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-paper hover:text-ink"
                onClick={() => onEdit(activity)}
                title="Edit activity"
                type="button"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label="Delete activity"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-roseSoft hover:text-red-600 disabled:opacity-50"
                disabled={deletion.isPending}
                onClick={() => {
                  if (window.confirm("Delete this activity? This cannot be undone.")) deletion.mutate(activity.id);
                }}
                title="Delete activity"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activity.tags.map((tag) => (
              <ActivityTagChip key={tag} tag={tag} />
            ))}
          </div>
          {activity.note ? <p className="mt-2 line-clamp-2 text-sm text-muted">{activity.note}</p> : null}
          {isReportRow(activity) ? (
            <div className="mt-auto border-t border-line pt-2.5 text-xs text-muted">
              Household usage during period · {formatKwh(activity.electricityKwh)} ·{" "}
              {formatCurrency(activity.electricitySpend)}
            </div>
          ) : null}
        </article>
      ))}
      {deletion.error ? (
        <p className="text-sm text-red-600 sm:col-span-2 xl:col-span-3">{deletion.error.message}</p>
      ) : null}
    </div>
  );
}
