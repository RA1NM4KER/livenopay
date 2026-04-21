import { z } from "zod";

export const filterQueryParamKeys = {
  from: "from",
  to: "to"
} as const;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const dateRangeQuerySchema = z.object({
  from: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return isoDatePattern.test(trimmed) ? trimmed : "";
    }),
  to: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? "";
      return isoDatePattern.test(trimmed) ? trimmed : "";
    })
});

export type DateRangeQueryParams = {
  from: string;
  to: string;
};

export function dateRangeQueryUpdates(from: string, to: string) {
  return {
    [filterQueryParamKeys.from]: from || null,
    [filterQueryParamKeys.to]: to || null
  };
}

export function parseDateRangeQuery(searchParams: URLSearchParams): DateRangeQueryParams {
  return dateRangeQuerySchema.parse({
    from: searchParams.get(filterQueryParamKeys.from) ?? undefined,
    to: searchParams.get(filterQueryParamKeys.to) ?? undefined
  });
}
