"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { adminUsersQueryParamKeys, parseAdminUsersQuery } from "@/lib/admin-users-query-params";
import { applyQueryUpdates, queryHref } from "@/lib/url-query";

export type AdminUsersUrlState = {
  sortKey: "joined";
  sortDirection: "asc" | "desc";
  isPending: boolean;
  onSortChange: () => void;
};

export function useAdminUsersUrlState(): AdminUsersUrlState {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const state = useMemo(() => parseAdminUsersQuery(new URLSearchParams(searchParams.toString())), [searchParams]);

  const onSortChange = () => {
    const nextDirection = state.sortDirection === "asc" ? "desc" : "asc";
    const next = applyQueryUpdates(searchParams, {
      [adminUsersQueryParamKeys.sort]: "joined",
      [adminUsersQueryParamKeys.direction]: nextDirection === "asc" ? null : nextDirection
    });

    startTransition(() => {
      router.replace(queryHref(pathname, next), { scroll: false });
    });
  };

  return {
    sortKey: state.sortKey,
    sortDirection: state.sortDirection,
    isPending,
    onSortChange
  };
}
