const dayMs = 86_400_000;

function isoDateOffset(date: string, offsetDays: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function inclusiveDayCount(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);
}

export function previousComparableScope(scope: { from: string; to: string }) {
  const days = inclusiveDayCount(scope.from, scope.to);
  return {
    from: isoDateOffset(scope.from, -days),
    to: isoDateOffset(scope.from, -1)
  };
}

export function percentChange(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}
