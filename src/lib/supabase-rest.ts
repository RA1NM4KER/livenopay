import "server-only";

const PAGE_SIZE = 1000;

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and a Supabase API key for dashboard data access.");
  }

  return {
    key,
    restUrl: `${url.replace(/\/$/, "")}/rest/v1`
  };
}

export async function supabaseResponse(path: string, init?: RequestInit) {
  const { key, restUrl } = supabaseConfig();
  const response = await fetch(`${restUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }

  return response;
}

export async function supabaseFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await supabaseResponse(path, init);
  return (await response.json()) as Promise<T>;
}

export async function supabaseFetchAllPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await supabaseFetch<T[]>(path, {
      headers: {
        Range: `${offset}-${offset + PAGE_SIZE - 1}`
      }
    });

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}
