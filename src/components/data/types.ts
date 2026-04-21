export type SortKey = "period" | "type" | "band" | "kwh" | "tariff" | "amount" | "balance" | "captured";

export type SortDirection = "asc" | "desc";

export type SortHeaderProps = {
  label: string;
  sortKey: SortKey;
  align?: "left" | "right";
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
};
