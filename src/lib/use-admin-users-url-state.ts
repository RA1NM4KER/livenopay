"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { adminUsersQueryParamKeys, parseAdminUsersQuery } from "@/lib/admin-users-query-params";
import { applyQueryUpdates, queryHref } from "@/lib/url-query";

export type AdminUsersUrlState = {
  sortKey: "joined";
  sortDirection: "asc" | "desc";
  page: number;
  isPending: boolean;
  onSortChange: () => void;
  onPageChange: (page: number) => void;
};

export function useAdminUsersUrlState(): AdminUsersUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const state = useMemo(() => parseAdminUsersQuery(new URLSearchParams(searchParams.toString())), [searchParams]);

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const next = applyQueryUpdates(searchParams, updates);
    startTransition(() => {
      router.replace(queryHref(pathname, next), { scroll: false });
    });
  };

  const onSortChange = () => {
    const nextDirection = state.sortDirection === "asc" ? "desc" : "asc";

    updateSearchParams({
      [adminUsersQueryParamKeys.sort]: "joined",
      [adminUsersQueryParamKeys.direction]: nextDirection === "asc" ? null : nextDirection,
      [adminUsersQueryParamKeys.page]: null
    });
  };

  const onPageChange = (page: number) => {
    updateSearchParams({
      [adminUsersQueryParamKeys.page]: page > 1 ? String(Math.floor(page)) : null
    });
  };

  return {
    sortKey: state.sortKey,
    sortDirection: state.sortDirection,
    page: state.page,
    isPending,
    onSortChange,
    onPageChange
  };
}
