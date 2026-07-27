import { z } from "zod";

export const adminUsersQueryParamKeys = {
  sort: "sort",
  direction: "dir"
} as const;

export const adminUsersSortKeyOptions = ["joined"] as const;

const sortKeySchema = z.enum(adminUsersSortKeyOptions);
const sortDirectionSchema = z.enum(["asc", "desc"]);

const adminUsersQuerySchema = z.object({
  sort: sortKeySchema.catch("joined"),
  dir: sortDirectionSchema.catch("asc")
});

export type AdminUsersQueryParams = {
  sortKey: (typeof adminUsersSortKeyOptions)[number];
  sortDirection: "asc" | "desc";
};

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
