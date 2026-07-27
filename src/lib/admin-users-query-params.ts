import { z } from "zod";

export const adminUsersQueryParamKeys = {
  page: "page",
  sort: "sort",
  direction: "dir"
} as const;

export const adminUsersSortKeyOptions = ["joined"] as const;
export const adminUsersPageSize = 15;

const sortKeySchema = z.enum(adminUsersSortKeyOptions);
const sortDirectionSchema = z.enum(["asc", "desc"]);

const adminUsersQuerySchema = z.object({
  sort: sortKeySchema.catch("joined"),
  dir: sortDirectionSchema.catch("asc"),
  page: z.coerce.number().int().positive().catch(1)
});

export type AdminUsersQueryParams = {
  sortKey: (typeof adminUsersSortKeyOptions)[number];
  sortDirection: "asc" | "desc";
  page: number;
};

export function parseAdminUsersQuery(searchParams: URLSearchParams): AdminUsersQueryParams {
  const parsed = adminUsersQuerySchema.parse({
    sort: searchParams.get(adminUsersQueryParamKeys.sort) ?? undefined,
    dir: searchParams.get(adminUsersQueryParamKeys.direction) ?? undefined,
    page: searchParams.get(adminUsersQueryParamKeys.page) ?? undefined
  });

  return {
    sortKey: parsed.sort,
    sortDirection: parsed.dir,
    page: parsed.page
  };
}
