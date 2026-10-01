import { describe, expect, it } from "vitest";
import { effectiveRows, formatMetricValue, isStale, normalizeMeasurement, overlappingSumPeriod, reviewedActual, validateCampaignTarget, type DefinitionRef, type MeasurementDraft, type MeasurementRow } from "./measurements";

const now = new Date("2026-10-20T12:00:00Z");
const countDef: DefinitionRef = { id: "def_signups_v1", brandId: "brand_rank", unit: "COUNT", aggregation: "SUM", status: "ACTIVE", freshnessDays: 7 };
const rateDef: DefinitionRef = { id: "def_repeat_v1", brandId: "brand_rank", unit: "RATE", aggregation: "COHORT", status: "ACTIVE", freshnessDays: 14 };
const base: MeasurementDraft = { definition: countDef, brandId: "brand_rank", value: null, periodStart: new Date("2026-10-01T05:00:00Z"), periodEnd: new Date("2026-10-08T05:00:00Z"), asOfAt: new Date("2026-10-09T12:00:00Z"), source: "Product admin export" };

describe("measurement normalization", () => {
  it("treats null as UNKNOWN and zero as a real report", () => {
    expect(normalizeMeasurement(base, now)).toMatchObject({ value: null, status: "UNKNOWN" });
    expect(normalizeMeasurement({ ...base, value: "0" }, now)).toMatchObject({ value: 0, status: "REPORTED" });
  });

  it("derives cohort rates from numerator/denominator and rejects mismatches", () => {
    expect(normalizeMeasurement({ ...base, definition: rateDef, value: null, numerator: 12, denominator: 40 }, now)).toMatchObject({ value: 30, numerator: 12, denominator: 40, status: "REPORTED" });
    expect(() => normalizeMeasurement({ ...base, definition: rateDef, value: 50, numerator: 12, denominator: 40 }, now)).toThrow("does not match");
    expect(() => normalizeMeasurement({ ...base, definition: rateDef, value: 30 }, now)).toThrow("Cohort metrics require numerator and denominator");
    expect(() => normalizeMeasurement({ ...base, definition: rateDef, numerator: 41, denominator: 40, value: null }, now)).toThrow("cannot exceed");
    expect(() => normalizeMeasurement({ ...base, definition: rateDef, numerator: 1, denominator: 0, value: null }, now)).toThrow("greater than zero");
  });

  it("enforces rate range, count integrality and non-negativity", () => {
    const latestRate: DefinitionRef = { ...rateDef, aggregation: "LATEST" };
    expect(() => normalizeMeasurement({ ...base, definition: latestRate, value: 140 }, now)).toThrow("between 0 and 100");
    expect(() => normalizeMeasurement({ ...base, value: 2.5 }, now)).toThrow("whole numbers");
    expect(() => normalizeMeasurement({ ...base, value: -1 }, now)).toThrow("negative");
  });

  it("validates period, source, definition version status and brand", () => {
    expect(() => normalizeMeasurement({ ...base, periodEnd: base.periodStart }, now)).toThrow("Period end");
    expect(() => normalizeMeasurement({ ...base, source: " " }, now)).toThrow("source");
    expect(() => normalizeMeasurement({ ...base, asOfAt: new Date("2026-11-01T00:00:00Z") }, now)).toThrow("future");
    expect(() => normalizeMeasurement({ ...base, definition: { ...countDef, status: "RETIRED" } }, now)).toThrow("ACTIVE");
    expect(() => normalizeMeasurement({ ...base, brandId: "brand_other" }, now)).toThrow("brand must match");
  });

  it("validates same-brand campaign and activation attribution", () => {
    expect(() => normalizeMeasurement({ ...base, value: 3, campaign: { id: "c1", brandIds: ["brand_other"] } }, now)).toThrow("not part of the selected campaign");
    expect(() => normalizeMeasurement({ ...base, value: 3, campaign: { id: "c1", brandIds: ["brand_rank"] }, activation: { id: "a1", campaignId: "c2", brandIds: [] } }, now)).toThrow("Activation does not belong");
    expect(normalizeMeasurement({ ...base, value: 3, campaign: { id: "c1", brandIds: ["brand_rank"] }, activation: { id: "a1", campaignId: "c1", brandIds: ["brand_rank"] } }, now).value).toBe(3);
  });
});

const row = (id: string, start: string, end: string, extra: Partial<MeasurementRow> = {}): MeasurementRow => ({ id, periodStart: new Date(start), periodEnd: new Date(end), value: 10, numerator: null, denominator: null, status: "REVIEWED", asOfAt: new Date(end), ...extra });

describe("period overlap and corrections", () => {
  it("rejects overlapping SUM periods within the same slice", () => {
    const existing = [row("m1", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z")];
    expect(overlappingSumPeriod(existing, row("new", "2026-10-05T05:00:00Z", "2026-10-12T05:00:00Z"))?.id).toBe("m1");
    expect(overlappingSumPeriod(existing, row("new", "2026-10-08T05:00:00Z", "2026-10-15T05:00:00Z"))).toBeNull();
    expect(overlappingSumPeriod(existing, row("new", "2026-10-05T05:00:00Z", "2026-10-12T05:00:00Z", { scope: "discord" }))).toBeNull();
  });

  it("lets a correction replace the record it supersedes", () => {
    const existing = [row("m1", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z")];
    expect(overlappingSumPeriod(existing, row("fix", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z", { supersedesId: "m1" }))).toBeNull();
    const corrected = [...existing, row("fix", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z", { supersedesId: "m1", value: 12 })];
    expect(effectiveRows(corrected).map((r) => r.id)).toEqual(["fix"]);
  });
});

describe("reviewed actuals", () => {
  const window = { start: new Date("2026-10-01T05:00:00Z"), end: new Date("2026-10-31T05:00:00Z") };

  it("sums disjoint reviewed count periods without double-counting corrections", () => {
    const rows = [
      row("w1", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z", { value: 10 }),
      row("w2", "2026-10-08T05:00:00Z", "2026-10-15T05:00:00Z", { value: 0 }),
      row("w2fix", "2026-10-08T05:00:00Z", "2026-10-15T05:00:00Z", { value: 4, supersedesId: "w2" }),
      row("w3", "2026-10-15T05:00:00Z", "2026-10-22T05:00:00Z", { value: 99, status: "REPORTED" }),
    ];
    expect(reviewedActual(countDef, rows, window)).toMatchObject({ value: 14, status: "MEASURED", pendingReview: 1, measurementIds: ["w1", "w2fix"] });
  });

  it("returns UNKNOWN when nothing reviewed exists", () => {
    expect(reviewedActual(countDef, [row("w1", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z", { status: "UNKNOWN", value: null })], window)).toMatchObject({ value: null, status: "UNKNOWN" });
  });

  it("pools cohort rates by numerator/denominator and never sums percentages", () => {
    const rows = [
      row("c1", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z", { value: 50, numerator: 5, denominator: 10, cohortKey: "wk1" }),
      row("c2", "2026-10-08T05:00:00Z", "2026-10-15T05:00:00Z", { value: 10, numerator: 3, denominator: 30, cohortKey: "wk2" }),
    ];
    expect(reviewedActual(rateDef, rows, window).value).toBe(20);
  });

  it("falls back to the latest reviewed rate when fractions are unavailable", () => {
    const latestRate: DefinitionRef = { ...rateDef, aggregation: "LATEST" };
    const rows = [row("r1", "2026-10-01T05:00:00Z", "2026-10-08T05:00:00Z", { value: 40 }), row("r2", "2026-10-08T05:00:00Z", "2026-10-15T05:00:00Z", { value: 60 })];
    expect(reviewedActual(latestRate, rows, window)).toMatchObject({ value: 60, basis: "Latest reviewed measurement" });
  });

  it("flags stale data and formats unknown", () => {
    expect(isStale(new Date("2026-10-01T00:00:00Z"), 7, now)).toBe(true);
    expect(isStale(new Date("2026-10-18T00:00:00Z"), 7, now)).toBe(false);
    expect(isStale(null, 7, now)).toBe(false);
    expect(formatMetricValue(null, "COUNT")).toBe("UNKNOWN");
    expect(formatMetricValue(0, "COUNT")).toBe("0");
    expect(formatMetricValue(33.333, "RATE")).toBe("33.33%");
  });
});

describe("campaign targets", () => {
  const campaign = { id: "c1", brandIds: ["brand_rank", "brand_sng"], activationIds: ["a1"] };
  const valid = { campaign, brandId: "brand_rank", activationId: "a1", definition: { brandId: "brand_rank", status: "ACTIVE" as const, unit: "COUNT" as const }, targetValue: "40", baselineValue: null, periodStart: new Date("2026-10-01T05:00:00Z"), periodEnd: new Date("2026-10-29T05:00:00Z"), dueAt: null };

  it("supports a valid target with unknown baseline", () => {
    expect(validateCampaignTarget(valid)).toEqual({ targetValue: 40, baselineValue: null });
  });

  it("requires brand, activation and metric compatibility", () => {
    expect(() => validateCampaignTarget({ ...valid, brandId: "brand_x" })).toThrow("brand must belong");
    expect(() => validateCampaignTarget({ ...valid, activationId: "a9" })).toThrow("activation must belong");
    expect(() => validateCampaignTarget({ ...valid, definition: { ...valid.definition, brandId: "brand_sng" } })).toThrow("different brand");
    expect(() => validateCampaignTarget({ ...valid, definition: { ...valid.definition, status: "DRAFT" } })).toThrow("ACTIVE metric definition");
  });

  it("validates numeric ranges and period order", () => {
    expect(() => validateCampaignTarget({ ...valid, targetValue: "" })).toThrow("numeric target");
    expect(() => validateCampaignTarget({ ...valid, targetValue: "-3" })).toThrow("negative");
    expect(() => validateCampaignTarget({ ...valid, definition: { ...valid.definition, unit: "RATE" }, targetValue: "120" })).toThrow("between 0 and 100");
    expect(() => validateCampaignTarget({ ...valid, periodEnd: valid.periodStart })).toThrow("period end");
  });
});
