export const EmptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false
} as const;

export const GetTopDaysSchema = {
  type: "object",
  properties: {
    metric: {
      type: "string",
      enum: ["spend", "kwh", "tariff", "waterKl", "waterSpend"]
    },
    limit: {
      type: "number",
      minimum: 1,
      maximum: 10
    }
  },
  required: ["metric"],
  additionalProperties: false
} as const;

export const GetTopHoursSchema = {
  type: "object",
  properties: {
    metric: {
      type: "string",
      enum: ["spend", "kwh"]
    },
    limit: {
      type: "number",
      minimum: 1,
      maximum: 10
    }
  },
  required: ["metric"],
  additionalProperties: false
} as const;

export const ExplainDaySchema = {
  type: "object",
  properties: {
    date: {
      type: "string",
      description: "ISO date in YYYY-MM-DD format."
    }
  },
  required: ["date"],
  additionalProperties: false
} as const;

export const GetRecentTopupsSchema = {
  type: "object",
  properties: {
    limit: {
      type: "number",
      minimum: 1,
      maximum: 20
    }
  },
  additionalProperties: false
} as const;

export const GetDataStatusSchema = {
  type: "object",
  properties: {
    limit: {
      type: "number",
      description: "Maximum number of incomplete/possible-gap dates to list.",
      minimum: 1,
      maximum: 30
    }
  },
  additionalProperties: false
} as const;

export const GetActivityReportSchema = {
  type: "object",
  properties: {
    from: {
      type: "string",
      description: "ISO date (YYYY-MM-DD). Defaults to the active dashboard scope start."
    },
    to: {
      type: "string",
      description: "ISO date (YYYY-MM-DD). Defaults to the active dashboard scope end."
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Filter to activities that have at least one of these tags."
    },
    utility: {
      type: "string",
      enum: ["all", "electricity", "water"]
    },
    groupBy: {
      type: "string",
      enum: ["none", "tag"],
      description: "'none' returns individual activity occurrences; 'tag' returns per-tag aggregate metrics."
    },
    includeNotes: {
      type: "boolean",
      description:
        "Include free-text activity notes. Defaults to false; only set true when the user is asking what happened or about notes specifically."
    }
  },
  additionalProperties: false
} as const;
