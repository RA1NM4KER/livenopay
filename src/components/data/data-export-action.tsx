"use client";

import { ExportButton } from "@/components/ui/export-button";
import { useDataTableUrlState } from "@/lib/use-data-table-url-state";

export function DataExportAction() {
  const { from, to, chargeType, searchQuery, sortKey, sortDirection } = useDataTableUrlState();

  return (
    <ExportButton
      from={from || undefined}
      to={to || undefined}
      chargeType={chargeType !== "all" ? chargeType : undefined}
      search={searchQuery || undefined}
      sort={sortKey !== "captured" ? sortKey : undefined}
      dir={sortDirection !== "desc" ? sortDirection : undefined}
      iconOnly
    />
  );
}
