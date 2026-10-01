import { addCentralDays, startOfCentralDay } from "./time";

export type MetricUnit = "COUNT" | "RATE" | "AMOUNT";
export type MetricAggregation = "SUM" | "LATEST" | "COHORT";
export type MetricDefinitionStatus = "DRAFT" | "ACTIVE" | "RETIRED";
export type MeasurementStatus = "UNKNOWN" | "REPORTED" | "REVIEWED";

export const funnelStages = ["REACH", "VISIT", "SIGNUP", "ACTIVATION", "REPEAT", "REFERRAL"] as const;
export const metricUnits = ["COUNT", "RATE", "AMOUNT"] as const;
export const metricAggregations = ["SUM", "LATEST", "COHORT"] as const;

export type DefinitionRef = { id: string; brandId: string; unit: MetricUnit; aggregation: MetricAggregation; status: MetricDefinitionStatus; freshnessDays: number | null };

function parseDecimal(raw: string | number | null | undefined, label: string) {
  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim().replace(/,/g, "");
  if (!value) return null;
  if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`${label} must be a number`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number`);
  return parsed;
}

function round4(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

export type MeasurementDraft = {
  definition: DefinitionRef;
  brandId: string;
  value: string | number | null;
  numerator?: string | number | null;
  denominator?: string | number | null;
  periodStart: Date;
  periodEnd: Date;
  asOfAt: Date;
  source: string;
  sourceUrl?: string | null;
  campaign?: { id: string; brandIds: string[] } | null;
  activation?: { id: string; campaignId: string; brandIds: string[] } | null;
};

export type NormalizedMeasurement = { value: number | null; numerator: number | null; denominator: number | null; status: Exclude<MeasurementStatus, "REVIEWED"> };

/** Null value means UNKNOWN; zero is a real report. RATE values are percentages 0–100, derived from numerator/denominator when supplied. */
export function normalizeMeasurement(input: MeasurementDraft, now = new Date()): NormalizedMeasurement {
  const { definition } = input;
  if (definition.status !== "ACTIVE") throw new Error("Measurements can only be recorded against an ACTIVE metric definition version");
  if (definition.brandId !== input.brandId) throw new Error("Measurement brand must match the metric definition brand");
  if (!(input.periodEnd > input.periodStart)) throw new Error("Period end must be after period start");
  if (input.asOfAt.getTime() > now.getTime() + 5 * 60_000) throw new Error("As-of time cannot be in the future");
  if (!input.source.trim()) throw new Error("A source is required for every measurement");
  if (input.sourceUrl && !/^https?:\/\//i.test(input.sourceUrl.trim())) throw new Error("Source URL must be an http(s) link");
  if (input.campaign && !input.campaign.brandIds.includes(input.brandId)) throw new Error("Measurement brand is not part of the selected campaign");
  if (input.activation) {
    if (!input.campaign || input.activation.campaignId !== input.campaign.id) throw new Error("Activation does not belong to the selected campaign");
    if (input.activation.brandIds.length && !input.activation.brandIds.includes(input.brandId)) throw new Error("Measurement brand is not part of the selected activation");
  }

  let value = parseDecimal(input.value, "Value");
  const numerator = parseDecimal(input.numerator, "Numerator");
  const denominator = parseDecimal(input.denominator, "Denominator");

  if ((numerator === null) !== (denominator === null)) throw new Error("Numerator and denominator must be supplied together");
  if (numerator !== null && denominator !== null) {
    if (definition.unit !== "RATE" && definition.aggregation !== "COHORT") throw new Error("Numerator/denominator only apply to rate or cohort metrics");
    if (denominator <= 0) throw new Error("Denominator must be greater than zero");
    if (numerator < 0) throw new Error("Numerator cannot be negative");
    if (definition.unit === "RATE") {
      if (numerator > denominator) throw new Error("Numerator cannot exceed denominator for a rate");
      const derived = round4((numerator / denominator) * 100);
      if (value !== null && Math.abs(value - derived) > 0.01) throw new Error(`Rate ${value}% does not match numerator/denominator (${derived}%)`);
      value = derived;
    }
  } else if (definition.aggregation === "COHORT" && value !== null) {
    throw new Error("Cohort metrics require numerator and denominator so rates are never averaged");
  }

  if (value !== null) {
    if (value < 0) throw new Error("Value cannot be negative");
    if (definition.unit === "RATE" && value > 100) throw new Error("Rates are percentages between 0 and 100");
    if (definition.unit === "COUNT" && !Number.isInteger(value)) throw new Error("Counts must be whole numbers");
  }

  return { value, numerator, denominator, status: value === null ? "UNKNOWN" : "REPORTED" };
}

export type PeriodRow = { id: string; periodStart: Date; periodEnd: Date; scope?: string | null; cohortKey?: string | null; campaignId?: string | null; activationId?: string | null; supersedesId?: string | null };

/** A measurement is effective unless a later correction supersedes it. */
export function effectiveRows<T extends { id: string; supersedesId?: string | null }>(rows: T[]) {
  const superseded = new Set(rows.map((row) => row.supersedesId).filter(Boolean));
  return rows.filter((row) => !superseded.has(row.id));
}

function sameSlice(a: PeriodRow, b: PeriodRow) {
  return (a.scope ?? "") === (b.scope ?? "") && (a.cohortKey ?? "") === (b.cohortKey ?? "") && (a.campaignId ?? "") === (b.campaignId ?? "") && (a.activationId ?? "") === (b.activationId ?? "");
}

/** SUM metrics need disjoint periods within the same slice; otherwise totals double-count. A correction (supersedesId) replaces its predecessor instead. */
export function overlappingSumPeriod(existing: PeriodRow[], candidate: PeriodRow) {
  const active = effectiveRows(existing).filter((row) => row.id !== candidate.supersedesId && row.id !== candidate.id);
  return active.find((row) => sameSlice(row, candidate) && row.periodStart < candidate.periodEnd && candidate.periodStart < row.periodEnd) ?? null;
}

export type MeasurementRow = PeriodRow & { value: number | null; numerator: number | null; denominator: number | null; status: MeasurementStatus; asOfAt: Date };

export type Actual = { value: number | null; status: "UNKNOWN" | "MEASURED"; asOfAt: Date | null; basis: string; measurementIds: string[]; pendingReview: number };

/** Combines reviewed measurements inside a window without ever summing percentages. */
export function reviewedActual(definition: Pick<DefinitionRef, "unit" | "aggregation">, rows: MeasurementRow[], window: { start: Date; end: Date }): Actual {
  const effective = effectiveRows(rows).filter((row) => row.periodStart >= window.start && row.periodEnd <= window.end);
  const pendingReview = effective.filter((row) => row.status === "REPORTED").length;
  const reviewed = effective.filter((row) => row.status === "REVIEWED" && row.value !== null);
  if (!reviewed.length) return { value: null, status: "UNKNOWN", asOfAt: null, basis: "No reviewed measurement in period", measurementIds: [], pendingReview };
  const asOfAt = new Date(Math.max(...reviewed.map((row) => row.asOfAt.getTime())));
  if (definition.aggregation === "SUM" && definition.unit !== "RATE") {
    return { value: round4(reviewed.reduce((sum, row) => sum + (row.value ?? 0), 0)), status: "MEASURED", asOfAt, basis: `Sum of ${reviewed.length} disjoint reviewed period(s)`, measurementIds: reviewed.map((row) => row.id), pendingReview };
  }
  const withFractions = reviewed.filter((row) => row.numerator !== null && row.denominator !== null);
  if ((definition.aggregation === "COHORT" || definition.unit === "RATE") && withFractions.length === reviewed.length && reviewed.length > 1) {
    const numerator = withFractions.reduce((sum, row) => sum + (row.numerator ?? 0), 0);
    const denominator = withFractions.reduce((sum, row) => sum + (row.denominator ?? 0), 0);
    const value = definition.unit === "RATE" ? round4((numerator / denominator) * 100) : round4(numerator / denominator);
    return { value, status: "MEASURED", asOfAt, basis: `Pooled ${numerator}/${denominator} across ${reviewed.length} cohort(s)`, measurementIds: reviewed.map((row) => row.id), pendingReview };
  }
  const latest = [...reviewed].sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime() || b.asOfAt.getTime() - a.asOfAt.getTime())[0];
  return { value: latest.value, status: "MEASURED", asOfAt: latest.asOfAt, basis: "Latest reviewed measurement", measurementIds: [latest.id], pendingReview };
}

export function isStale(asOfAt: Date | null, freshnessDays: number | null | undefined, now: Date) {
  if (!asOfAt || !freshnessDays) return false;
  return now.getTime() - asOfAt.getTime() > freshnessDays * 86_400_000;
}

export function formatMetricValue(value: number | null, unit: MetricUnit) {
  if (value === null) return "UNKNOWN";
  if (unit === "RATE") return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export type DefinitionDraft = {
  key: string;
  label: string;
  unit: MetricUnit;
  aggregation: MetricAggregation;
  definition: string;
  numeratorDefinition: string | null;
  denominatorDefinition: string | null;
  cohortBasis: string | null;
  freshnessDays: number | null;
};

export function validateMetricDefinition(input: DefinitionDraft) {
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(input.key) || input.key.length > 80) throw new Error("Key must be lowercase letters, numbers, dashes or underscores (max 80)");
  if (!input.label.trim()) throw new Error("A label is required");
  if (!input.definition.trim()) throw new Error("A plain-language definition is required");
  if (input.unit === "RATE" && input.aggregation === "SUM") throw new Error("Rates cannot use SUM aggregation; percentages are never summed");
  if (input.unit === "RATE" && (!input.numeratorDefinition?.trim() || !input.denominatorDefinition?.trim())) throw new Error("Rate metrics must define the numerator and denominator");
  if (input.aggregation === "COHORT" && !input.cohortBasis?.trim()) throw new Error("Cohort metrics must define the cohort basis");
  if (input.freshnessDays !== null && (!Number.isInteger(input.freshnessDays) || input.freshnessDays < 1 || input.freshnessDays > 365)) throw new Error("Freshness must be 1–365 days");
}

/** Date inputs are inclusive Central dates; storage uses [start, end) so adjacent periods never overlap. */
export function inclusiveEndToExclusive(end: Date) {
  return startOfCentralDay(addCentralDays(end, 1));
}

export function exclusiveEndToInclusive(end: Date) {
  return startOfCentralDay(addCentralDays(end, -1));
}

export type TargetDraft = {
  campaign: { id: string; brandIds: string[]; activationIds: string[] };
  brandId: string;
  activationId: string | null;
  definition: Pick<DefinitionRef, "brandId" | "status" | "unit">;
  targetValue: string | number;
  baselineValue: string | number | null;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date | null;
};

export function validateCampaignTarget(input: TargetDraft) {
  if (!input.campaign.brandIds.includes(input.brandId)) throw new Error("Target brand must belong to the campaign");
  if (input.activationId && !input.campaign.activationIds.includes(input.activationId)) throw new Error("Target activation must belong to the campaign");
  if (input.definition.brandId !== input.brandId) throw new Error("Metric definition belongs to a different brand");
  if (input.definition.status !== "ACTIVE") throw new Error("Targets must use an ACTIVE metric definition version");
  if (!(input.periodEnd > input.periodStart)) throw new Error("Target period end must be after period start");
  const targetValue = parseDecimal(input.targetValue, "Target value");
  if (targetValue === null) throw new Error("A numeric target value is required");
  const baselineValue = parseDecimal(input.baselineValue, "Baseline value");
  for (const [label, value] of [["Target", targetValue], ["Baseline", baselineValue]] as const) {
    if (value === null) continue;
    if (value < 0) throw new Error(`${label} cannot be negative`);
    if (input.definition.unit === "RATE" && value > 100) throw new Error(`${label} rate must be between 0 and 100`);
  }
  return { targetValue, baselineValue };
}
