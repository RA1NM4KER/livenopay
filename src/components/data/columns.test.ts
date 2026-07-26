import { describe, expect, it } from "vitest";
import { dataTableColumnAlign, dataTableColumnLabel, dataTableColumns } from "@/components/data/columns";

describe("dataTableColumns derived maps", () => {
  it("has no duplicate column ids", () => {
    const ids = dataTableColumns.map((column) => column.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("derives a label lookup matching every column", () => {
    for (const column of dataTableColumns) {
      expect(dataTableColumnLabel[column.id]).toBe(column.label);
    }
  });

  it("derives an alignment lookup matching every column", () => {
    for (const column of dataTableColumns) {
      expect(dataTableColumnAlign[column.id]).toBe(column.align);
    }
  });
});
