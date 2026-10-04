import type { GeneratedExecution } from "./schema";

type Iso = string | null;
const iso = (value: Date | null | undefined): Iso => (value ? value.toISOString() : null);

export type StrategyInputs = {
  now: Date;
  brief: { id: string; revision: number; stage: string; effectiveAt: Date | null; reviewAt: Date | null; approvedAt: Date | null; priorityAudience: string | null; offer: string | null; activationDefinition: string | null; repeatDefinition: string | null; bottleneck: string | null; primaryMotion: string | null } | null;
  priority: { id: string; revision: number; allocation: string; rationale: string; effectiveAt: Date; reviewAt: Date | null } | null;
  campaign: { id: string; offer: string | null; hypothesis: string | null } | null;
  targets: { id: string; activationId: string | null; targetValue: number; baselineValue: number | null; periodStart: Date; periodEnd: Date; definition: { id: string; key: string; version: number; label: string; unit: string } }[];
  measurements: { id: string; campaignId: string | null; activationId: string | null; value: number | null; numerator: number | null; denominator: number | null; periodStart: Date; periodEnd: Date; asOfAt: Date; source: string; definition: { id: string; key: string; version: number; label: string; unit: string } }[];
  reviews: { id: string; decision: string; learning: string; reviewedAt: Date }[];
};

export type StrategySnapshot = ReturnType<typeof buildStrategySnapshot>;

/** Point-in-time strategy context for a generation run. Human decisions are labeled as decisions; reviewed measurements as source-cited figures. */
export function buildStrategySnapshot(input: StrategyInputs) {
  const missingContext: string[] = [];
  const blockingGaps: string[] = [];
  const { brief, priority, campaign, now } = input;
  const briefEffective = Boolean(brief && (!brief.effectiveAt || brief.effectiveAt <= now));

  if (!brief) blockingGaps.push("No approved (CURRENT) Growth Brief for this Brand");
  else if (!briefEffective) blockingGaps.push(`Approved Growth Brief r${brief.revision} is not effective until ${iso(brief.effectiveAt)}`);
  else if (brief.reviewAt && brief.reviewAt < now) missingContext.push(`Growth Brief r${brief.revision} review date has passed; strategy may be outdated`);
  const offer = campaign?.offer?.trim() || (briefEffective ? brief?.offer?.trim() : null);
  if (!offer) blockingGaps.push("No approved offer in the Growth Brief or Campaign");
  if (!priority) missingContext.push("No human portfolio allocation for this Brand");
  if (campaign) {
    if (!campaign.hypothesis?.trim()) missingContext.push("Campaign hypothesis is not recorded");
    if (!input.targets.length) missingContext.push("Campaign has no numeric targets");
    if (!input.measurements.length) missingContext.push("No reviewed measurements for this Campaign; do not cite results");
  } else if (!input.measurements.length) missingContext.push("No reviewed Brand-level measurements; do not cite results");

  return {
    basis: "Growth Brief, portfolio allocation and campaign reviews are human decisions, not measured facts. Measurements are reviewed operator-entered figures with cited sources; anything absent is unknown.",
    growthBrief: brief && briefEffective ? { id: brief.id, revision: brief.revision, stage: brief.stage, effectiveAt: iso(brief.effectiveAt), reviewAt: iso(brief.reviewAt), approvedAt: iso(brief.approvedAt), priorityAudience: brief.priorityAudience, offer: brief.offer, activationDefinition: brief.activationDefinition, repeatDefinition: brief.repeatDefinition, bottleneck: brief.bottleneck, primaryMotion: brief.primaryMotion } : null,
    portfolioPriority: priority ? { id: priority.id, revision: priority.revision, allocation: priority.allocation, rationale: priority.rationale, effectiveAt: iso(priority.effectiveAt), reviewAt: iso(priority.reviewAt) } : null,
    campaignTargets: input.targets.map((target) => ({ id: target.id, metric: { definitionId: target.definition.id, key: target.definition.key, version: target.definition.version, label: target.definition.label, unit: target.definition.unit }, activationId: target.activationId, targetValue: target.targetValue, baselineValue: target.baselineValue, periodStart: iso(target.periodStart), periodEndExclusive: iso(target.periodEnd) })),
    reviewedMeasurements: input.measurements.map((row) => ({ id: row.id, metric: { definitionId: row.definition.id, key: row.definition.key, version: row.definition.version, label: row.definition.label, unit: row.definition.unit }, campaignId: row.campaignId, activationId: row.activationId, value: row.value, numerator: row.numerator, denominator: row.denominator, periodStart: iso(row.periodStart), periodEndExclusive: iso(row.periodEnd), asOfAt: iso(row.asOfAt), source: row.source })),
    campaignReviews: input.reviews.map((review) => ({ id: review.id, decision: review.decision, learning: review.learning, reviewedAt: iso(review.reviewedAt) })),
    missingContext,
    blockingGaps,
  };
}

/** CREATE cannot proceed on invented strategy: external executions with blocking gaps become NEEDS_MORE_CONTEXT. Internal strategy work may still discuss the gaps. */
export function applyStrategyGate(output: GeneratedExecution, strategy: Pick<StrategySnapshot, "blockingGaps"> | null | undefined, channel: string): GeneratedExecution {
  if (output.recommendation !== "CREATE" || channel === "INTERNAL_STRATEGY" || !strategy?.blockingGaps.length) return output;
  return {
    ...output,
    recommendation: "NEEDS_MORE_CONTEXT",
    reason: `Strategy context is incomplete: ${strategy.blockingGaps.join("; ")}. ${output.reason}`.slice(0, 5000),
    draftCopy: "",
    cta: "",
    warnings: [...output.warnings, "Downgraded from CREATE: an approved Growth Brief and offer are required before external copy."].slice(0, 50),
  };
}
