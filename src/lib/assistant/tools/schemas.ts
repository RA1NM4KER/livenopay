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
      enum: ["spend", "kwh", "tariff"]
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
