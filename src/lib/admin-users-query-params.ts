import { z } from "zod";

export const adminUsersQueryParamKeys = {
  sort: "sort",
  direction: "dir"
} as const;

export const adminUsersSortKeyOptions = ["joined", "lastSync"] as const;

export type AdminUsersSortKey = (typeof adminUsersSortKeyOptions)[number];

// Default view: most recently synced first -- the admin's usual "who's active".
export const ADMIN_USERS_DEFAULT_SORT: AdminUsersSortKey = "lastSync";
export const ADMIN_USERS_DEFAULT_DIRECTION: "asc" | "desc" = "desc";

const sortKeySchema = z.enum(adminUsersSortKeyOptions);
const sortDirectionSchema = z.enum(["asc", "desc"]);

const adminUsersQuerySchema = z.object({
  sort: sortKeySchema.catch(ADMIN_USERS_DEFAULT_SORT),
  dir: sortDirectionSchema.catch(ADMIN_USERS_DEFAULT_DIRECTION)
});

export type AdminUsersQueryParams = {
  sortKey: AdminUsersSortKey;
  sortDirection: "asc" | "desc";
};

// Default direction when a column is first selected: joined reads oldest-first;
// last sync is most useful most-recent-first.
export function defaultDirectionFor(key: AdminUsersSortKey): "asc" | "desc" {
  return key === "lastSync" ? "desc" : "asc";
}

export function parseAdminUsersQuery(searchParams: URLSearchParams): AdminUsersQueryParams {
  const parsed = adminUsersQuerySchema.parse({
    sort: searchParams.get(adminUsersQueryParamKeys.sort) ?? undefined,
    dir: searchParams.get(adminUsersQueryParamKeys.direction) ?? undefined
  });

  return {
    sortKey: parsed.sort,
    sortDirection: parsed.dir
  };
}
