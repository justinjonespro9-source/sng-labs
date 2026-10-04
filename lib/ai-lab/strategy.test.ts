import { describe, expect, it } from "vitest";
import { contextCompatibility } from "./compatibility";
import { draftObjective } from "./draft";
import { generatedExecutionSchema } from "./schema";
import { applyStrategyGate, buildStrategySnapshot, type StrategyInputs } from "./strategy";

const now = new Date("2026-10-01T15:00:00Z");
const brief = { id: "brief-2", revision: 2, stage: "VALIDATION", effectiveAt: new Date("2026-09-20T05:00:00Z"), reviewAt: new Date("2026-11-01T05:00:00Z"), approvedAt: new Date("2026-09-19T20:00:00Z"), priorityAudience: "Fantasy players", offer: "Free rankings", activationDefinition: "Saved first ranking", repeatDefinition: null, bottleneck: "Awareness", primaryMotion: "Community outreach" };
const metric = { id: "def-1", key: "signups", version: 2, label: "Signups", unit: "COUNT" };
const base: StrategyInputs = { now, brief, priority: { id: "prio-1", revision: 1, allocation: "PRIMARY_PUSH", rationale: "Season timing", effectiveAt: new Date("2026-09-01T05:00:00Z"), reviewAt: null }, campaign: null, targets: [], measurements: [], reviews: [] };
const createOutput = generatedExecutionSchema.parse({ recommendation: "CREATE", reason: "Kickoff", whyNow: "Week 5", editorialAngle: "Angle", draftCopy: "Copy", visualBrief: "", cta: "Join", recommendedChannel: "X", timing: "Sunday", evidenceUsed: [], assumptions: [], warnings: [] });

describe("AI Lab strategy snapshot", () => {
  it("persists IDs, revisions and as-of dates for brief, allocation, targets and reviewed measurements", () => {
    const snapshot = buildStrategySnapshot({ ...base, campaign: { id: "camp-1", offer: null, hypothesis: "Outreach converts" },
      targets: [{ id: "t-1", activationId: null, targetValue: 100, baselineValue: null, periodStart: new Date("2026-09-01T05:00:00Z"), periodEnd: new Date("2026-10-01T05:00:00Z"), definition: metric }],
      measurements: [{ id: "m-1", campaignId: "camp-1", activationId: null, value: 42, numerator: null, denominator: null, periodStart: new Date("2026-09-01T05:00:00Z"), periodEnd: new Date("2026-09-15T05:00:00Z"), asOfAt: new Date("2026-09-16T15:00:00Z"), source: "Supabase export", definition: metric }],
      reviews: [{ id: "r-1", decision: "CONTINUE", learning: "Clubs respond", reviewedAt: new Date("2026-09-20T15:00:00Z") }] });
    expect(snapshot.growthBrief).toMatchObject({ id: "brief-2", revision: 2, effectiveAt: "2026-09-20T05:00:00.000Z" });
    expect(snapshot.portfolioPriority).toMatchObject({ id: "prio-1", revision: 1 });
    expect(snapshot.campaignTargets[0]).toMatchObject({ id: "t-1", metric: { definitionId: "def-1", version: 2 } });
    expect(snapshot.reviewedMeasurements[0]).toMatchObject({ id: "m-1", value: 42, asOfAt: "2026-09-16T15:00:00.000Z", source: "Supabase export" });
    expect(snapshot.campaignReviews[0]).toMatchObject({ id: "r-1", decision: "CONTINUE" });
    expect(snapshot.blockingGaps).toEqual([]);
  });

  it("treats a missing CURRENT brief or offer as blocking and records non-blocking gaps", () => {
    const snapshot = buildStrategySnapshot({ ...base, brief: null, priority: null, campaign: { id: "camp-1", offer: null, hypothesis: null } });
    expect(snapshot.blockingGaps).toEqual(["No approved (CURRENT) Growth Brief for this Brand", "No approved offer in the Growth Brief or Campaign"]);
    expect(snapshot.missingContext).toEqual(expect.arrayContaining(["No human portfolio allocation for this Brand", "Campaign has no numeric targets", "No reviewed measurements for this Campaign; do not cite results"]));
  });

  it("does not treat a future-effective brief as current strategy", () => {
    const snapshot = buildStrategySnapshot({ ...base, brief: { ...brief, effectiveAt: new Date("2026-10-05T05:00:00Z") } });
    expect(snapshot.growthBrief).toBeNull();
    expect(snapshot.blockingGaps[0]).toContain("not effective until");
  });

  it("accepts a campaign offer when the brief has none", () => {
    expect(buildStrategySnapshot({ ...base, brief: { ...brief, offer: null }, campaign: { id: "c", offer: "Beta invite", hypothesis: "h" } }).blockingGaps).toEqual([]);
  });

  it("downgrades external CREATE to NEEDS_MORE_CONTEXT when strategy is blocking, but not internal strategy", () => {
    const gated = applyStrategyGate(createOutput, { blockingGaps: ["No approved offer"] }, "X");
    expect(gated.recommendation).toBe("NEEDS_MORE_CONTEXT");
    expect(gated.draftCopy).toBe("");
    expect(gated.reason).toContain("No approved offer");
    expect(generatedExecutionSchema.parse(gated).recommendation).toBe("NEEDS_MORE_CONTEXT");
    expect(applyStrategyGate(createOutput, { blockingGaps: ["No approved offer"] }, "INTERNAL_STRATEGY").recommendation).toBe("CREATE");
    expect(applyStrategyGate(createOutput, { blockingGaps: [] }, "X")).toBe(createOutput);
  });
});

describe("AI Lab context compatibility", () => {
  it("accepts a valid standalone activation without an Opportunity", () => {
    expect(contextCompatibility({ brandId: "b", selectedActivation: { id: "a", campaignId: "c", brandIds: ["b"] }, resolvedCampaign: { id: "c", programId: null, brandIds: ["b"] } }).errors).toEqual([]);
  });

  it("compares Activation and Opportunity only when both are selected", () => {
    const activation = { id: "a", campaignId: "c", brandIds: [] };
    expect(contextCompatibility({ brandId: "b", selectedActivation: activation, selectedOpportunity: { eventId: null, activationId: "other", campaignIds: [] } }).errors).toContain("Opportunity belongs to a different Activation");
    expect(contextCompatibility({ brandId: "b", selectedActivation: activation, selectedOpportunity: { eventId: null, activationId: null, campaignIds: ["c"] } }).errors).toEqual([]);
    expect(contextCompatibility({ brandId: "b", selectedActivation: activation, selectedOpportunity: { eventId: null, activationId: null, campaignIds: ["x"] } }).errors).toContain("Opportunity is not linked to the Activation's Campaign");
  });

  it("rejects records for a different Brand, Campaign or Program", () => {
    const result = contextCompatibility({ brandId: "b", selectedProgramId: "p1", selectedCampaign: { id: "c" }, selectedActivation: { id: "a", campaignId: "c2", brandIds: ["other"] }, relationship: { campaignIds: ["c9"], brandIds: ["other"] }, resolvedCampaign: { id: "c", programId: "p2", brandIds: ["other"] } });
    expect(result.errors).toEqual(expect.arrayContaining(["Campaign does not belong to the selected Growth Program", "Activation does not belong to the selected Campaign", "The Campaign does not include the selected Brand", "The Activation does not include the selected Brand", "The Relationship is not linked to the selected Campaign"]));
    expect(result.warnings).toEqual(["The Relationship does not list the selected Brand as relevant"]);
  });
});

describe("AI Lab draft objective", () => {
  it("uses the resolved activation or campaign objective, falling back for historical runs", () => {
    expect(draftObjective({ brand: { name: "RankEyeQ" }, campaign: { objective: "Recruit 50 league commissioners" } }, "EMAIL_OUTREACH")).toBe("Recruit 50 league commissioners (EMAIL_OUTREACH execution for RankEyeQ)");
    expect(draftObjective({ brand: { name: "RankEyeQ" }, campaign: { objective: "Campaign goal" }, activation: { objective: "Dallas meetup signups" } }, "X")).toContain("Dallas meetup signups");
    expect(draftObjective({ brand: { name: "RankEyeQ" }, campaign: null }, "X")).toBe("Create a X execution for RankEyeQ");
  });
});
