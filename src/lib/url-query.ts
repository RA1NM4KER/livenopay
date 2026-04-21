export type QueryUpdates = Record<string, string | null | undefined>;

export function applyQueryUpdates(searchParams: { toString(): string }, updates: QueryUpdates) {
  const next = new URLSearchParams(searchParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
  }

  return next;
}

export function queryHref(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
