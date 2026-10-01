"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { writeSocialAuditEvent } from "@/lib/social-accounts/audit";
import { completedAtFor, validateGrowthAction, type GrowthActionStatus } from "./actions-rules";
import { growthStages, type BriefContent } from "./briefs";
import { runFormAction } from "./form-action";
import { inclusiveEndToExclusive, metricAggregations, metricUnits, funnelStages, validateCampaignTarget, validateMetricDefinition } from "./measurements";
import { recordMeasurementTx } from "./measurement-store";
import { assertCanAllocatePortfolio, assertCanEditGrowth } from "./permissions";
import { parseWeeklyHours, portfolioAllocations } from "./priorities";
import { confirmManualPublicationTx, prepareManualHandoffTx } from "./publication-store";
import { approveGrowthBrief, archiveGrowthBrief, createGrowthBriefDraft, setPortfolioPriority, updateGrowthBriefDraft } from "./strategy-store";
import { parseCentralInput } from "./time";

async function requireGrowthEditor() {
  const user = await requireCommandCenterUser();
  assertCanEditGrowth(user.role);
  return user;
}

function str(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function required(formData: FormData, key: string, label: string) {
  const value = str(formData, key);
  if (!value) throw new Error(`${label} is required`);
  return value;
}

function lines(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").split("\n").map((value) => value.trim()).filter(Boolean);
}

function optionalInt(formData: FormData, key: string, label: string) {
  const raw = str(formData, key);
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) throw new Error(`${label} must be a whole number`);
  return Number(raw);
}

function briefContent(formData: FormData): BriefContent {
  return {
    stage: z.enum(growthStages).parse(formData.get("stage")),
    priorityAudience: str(formData, "priorityAudience"),
    marketId: str(formData, "marketId"),
    geographyNotes: str(formData, "geographyNotes"),
    offer: str(formData, "offer"),
    activationDefinition: str(formData, "activationDefinition"),
    repeatDefinition: str(formData, "repeatDefinition"),
    bottleneck: str(formData, "bottleneck"),
    primaryMotion: str(formData, "primaryMotion"),
    capacityNotes: str(formData, "capacityNotes"),
    effectiveAt: parseCentralInput(formData.get("effectiveAt")),
    reviewAt: parseCentralInput(formData.get("reviewAt")),
    notes: str(formData, "notes"),
  };
}

function revalidateGrowth(brandId?: string) {
  revalidatePath("/command-center");
  revalidatePath("/command-center/growth");
  if (brandId) revalidatePath(`/command-center/brands/${brandId}/growth`);
}

// Strategy ---------------------------------------------------------------

export async function createGrowthBriefAction(brandId: string, formData: FormData) {
  const returnTo = `/command-center/brands/${brandId}/growth`;
  await runFormAction(returnTo, async () => {
    const user = await requireGrowthEditor();
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) throw new Error("Brand not found");
    const brief = await createGrowthBriefDraft(prisma, { brandId, actorId: user.id, content: briefContent(formData) });
    revalidateGrowth(brandId);
    return { redirectTo: `${returnTo}?brief=${brief.id}`, saved: "draft" };
  });
}

export async function reviseGrowthBriefAction(briefId: string) {
  const source = await prisma.brandGrowthBrief.findUnique({ where: { id: briefId } });
  const returnTo = source ? `/command-center/brands/${source.brandId}/growth` : "/command-center/growth";
  await runFormAction(returnTo, async () => {
    const user = await requireGrowthEditor();
    if (!source) throw new Error("Growth Brief not found");
    const { stage, priorityAudience, marketId, geographyNotes, offer, activationDefinition, repeatDefinition, bottleneck, primaryMotion, capacityNotes, effectiveAt, reviewAt, notes } = source;
    const brief = await createGrowthBriefDraft(prisma, { brandId: source.brandId, actorId: user.id, content: { stage, priorityAudience, marketId, geographyNotes, offer, activationDefinition, repeatDefinition, bottleneck, primaryMotion, capacityNotes, effectiveAt, reviewAt, notes } });
    revalidateGrowth(source.brandId);
    return { redirectTo: `${returnTo}?brief=${brief.id}`, saved: "draft" };
  });
}

export async function updateGrowthBriefAction(briefId: string, formData: FormData) {
  const brief = await prisma.brandGrowthBrief.findUnique({ where: { id: briefId }, select: { brandId: true } });
  const returnTo = brief ? `/command-center/brands/${brief.brandId}/growth?brief=${briefId}` : "/command-center/growth";
  await runFormAction(returnTo, async () => {
    const user = await requireGrowthEditor();
    if (!brief) throw new Error("Growth Brief not found");
    await updateGrowthBriefDraft(prisma, { briefId, actorId: user.id, content: briefContent(formData) });
    revalidateGrowth(brief.brandId);
  });
}

export async function approveGrowthBriefAction(briefId: string) {
  const brief = await prisma.brandGrowthBrief.findUnique({ where: { id: briefId }, select: { brandId: true } });
  const returnTo = brief ? `/command-center/brands/${brief.brandId}/growth?brief=${briefId}` : "/command-center/growth";
  await runFormAction(returnTo, async () => {
    const user = await requireGrowthEditor();
    await approveGrowthBrief(prisma, { briefId, actorId: user.id });
    revalidateGrowth(brief?.brandId);
    return { saved: "approved" };
  });
}

export async function archiveGrowthBriefAction(briefId: string) {
  const brief = await prisma.brandGrowthBrief.findUnique({ where: { id: briefId }, select: { brandId: true } });
  const returnTo = brief ? `/command-center/brands/${brief.brandId}/growth` : "/command-center/growth";
  await runFormAction(returnTo, async () => {
    const user = await requireGrowthEditor();
    await archiveGrowthBrief(prisma, { briefId, actorId: user.id });
    revalidateGrowth(brief?.brandId);
    return { saved: "archived" };
  });
}

export async function setPortfolioPriorityAction(brandId: string, formData: FormData) {
  const returnTo = String(formData.get("returnTo") || "/command-center/growth");
  await runFormAction(returnTo.startsWith("/command-center") ? returnTo : "/command-center/growth", async () => {
    const user = await requireCommandCenterUser();
    assertCanAllocatePortfolio(user.role);
    const effectiveAt = parseCentralInput(formData.get("effectiveAt")) ?? new Date();
    const evidenceNotes = str(formData, "evidence");
    await setPortfolioPriority(prisma, {
      brandId, actorId: user.id, allocation: z.enum(portfolioAllocations).parse(formData.get("allocation")),
      rationale: required(formData, "rationale", "Rationale"), effectiveAt, reviewAt: parseCentralInput(formData.get("reviewAt")),
      weeklyHours: parseWeeklyHours(formData.get("weeklyHours")), evidence: evidenceNotes ? { notes: evidenceNotes } : null,
    });
    revalidateGrowth(brandId);
    return { saved: "priority" };
  });
}

// Measurement ------------------------------------------------------------

function definitionDraft(formData: FormData) {
  const draft = {
    key: required(formData, "key", "Key").toLowerCase(),
    label: required(formData, "label", "Label"),
    unit: z.enum(metricUnits).parse(formData.get("unit")),
    aggregation: z.enum(metricAggregations).parse(formData.get("aggregation")),
    definition: required(formData, "definition", "Definition"),
    numeratorDefinition: str(formData, "numeratorDefinition"),
    denominatorDefinition: str(formData, "denominatorDefinition"),
    cohortBasis: str(formData, "cohortBasis"),
    freshnessDays: optionalInt(formData, "freshnessDays", "Freshness"),
  };
  validateMetricDefinition(draft);
  return draft;
}

export async function createMetricDefinitionAction(formData: FormData) {
  await runFormAction("/command-center/scorecards", async () => {
    const user = await requireGrowthEditor();
    const brandId = required(formData, "brandId", "Brand");
    const draft = definitionDraft(formData);
    const funnelStage = z.enum(funnelStages).parse(formData.get("funnelStage"));
    const existing = await prisma.growthMetricDefinition.findFirst({ where: { brandId, key: draft.key }, select: { id: true } });
    if (existing) throw new Error("A definition with this key already exists for the brand. Create a new version instead of redefining it.");
    const definition = await prisma.growthMetricDefinition.create({ data: { ...draft, brandId, funnelStage, version: 1, effectiveAt: parseCentralInput(formData.get("effectiveAt")) ?? new Date(), status: "DRAFT", createdById: user.id } });
    await prisma.auditEvent.create({ data: { actorId: user.id, action: "growth_metric_definition.create", entityType: "GrowthMetricDefinition", entityId: definition.id, metadata: { brandId, key: draft.key, version: 1 } } });
    revalidatePath("/command-center/scorecards");
    return { saved: "definition" };
  });
}

export async function createMetricDefinitionVersionAction(definitionId: string, formData: FormData) {
  await runFormAction("/command-center/scorecards", async () => {
    const user = await requireGrowthEditor();
    const draft = definitionDraft(formData);
    const funnelStage = z.enum(funnelStages).parse(formData.get("funnelStage"));
    await prisma.$transaction(async (tx) => {
      const previous = await tx.growthMetricDefinition.findUnique({ where: { id: definitionId }, include: { supersededBy: { select: { id: true } } } });
      if (!previous) throw new Error("Metric definition not found");
      if (previous.supersededBy) throw new Error("A newer version already exists; version from the latest definition");
      if (draft.key !== previous.key) throw new Error("A new version keeps the same key");
      const latest = await tx.growthMetricDefinition.aggregate({ where: { brandId: previous.brandId, key: previous.key }, _max: { version: true } });
      const created = await tx.growthMetricDefinition.create({ data: { ...draft, brandId: previous.brandId, funnelStage, version: (latest._max.version ?? 0) + 1, effectiveAt: parseCentralInput(formData.get("effectiveAt")) ?? new Date(), status: "DRAFT", createdById: user.id, supersedesId: previous.id } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "growth_metric_definition.version", entityType: "GrowthMetricDefinition", entityId: created.id, metadata: { key: created.key, version: created.version, supersedesId: previous.id } } });
    }, { isolationLevel: "Serializable" });
    revalidatePath("/command-center/scorecards");
    return { saved: "version" };
  });
}

export async function setMetricDefinitionStatusAction(definitionId: string, formData: FormData) {
  await runFormAction("/command-center/scorecards", async () => {
    const user = await requireGrowthEditor();
    const status = z.enum(["ACTIVE", "RETIRED"]).parse(formData.get("status"));
    await prisma.$transaction(async (tx) => {
      const definition = await tx.growthMetricDefinition.findUnique({ where: { id: definitionId } });
      if (!definition) throw new Error("Metric definition not found");
      if (status === "ACTIVE") {
        if (definition.status !== "DRAFT") throw new Error("Only DRAFT definitions can be activated");
        await tx.growthMetricDefinition.updateMany({ where: { brandId: definition.brandId, key: definition.key, status: "ACTIVE", id: { not: definition.id } }, data: { status: "RETIRED" } });
      }
      await tx.growthMetricDefinition.update({ where: { id: definitionId }, data: { status } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: `growth_metric_definition.${status.toLowerCase()}`, entityType: "GrowthMetricDefinition", entityId: definitionId, metadata: { key: definition.key, version: definition.version } } });
    }, { isolationLevel: "Serializable" });
    revalidatePath("/command-center/scorecards");
  });
}

export async function recordMeasurementAction(formData: FormData) {
  const returnTo = String(formData.get("returnTo") || "/command-center/scorecards");
  await runFormAction(returnTo.startsWith("/command-center") ? returnTo : "/command-center/scorecards", async () => {
    const user = await requireGrowthEditor();
    const periodStart = parseCentralInput(formData.get("periodStart"));
    const periodEndInclusive = parseCentralInput(formData.get("periodEnd"));
    if (!periodStart || !periodEndInclusive) throw new Error("Period start and end are required");
    const asOfAt = parseCentralInput(formData.get("asOfAt")) ?? new Date();
    const measurement = await recordMeasurementTx(prisma, {
      definitionId: required(formData, "definitionId", "Metric definition"), value: str(formData, "value"), numerator: str(formData, "numerator"), denominator: str(formData, "denominator"),
      periodStart, periodEnd: inclusiveEndToExclusive(periodEndInclusive), asOfAt, source: required(formData, "source", "Source"), sourceUrl: str(formData, "sourceUrl"),
      campaignId: str(formData, "campaignId"), activationId: str(formData, "activationId"), scope: str(formData, "scope"), cohortKey: str(formData, "cohortKey"),
      externalKey: str(formData, "externalKey"), supersedesId: str(formData, "supersedesId"), notes: str(formData, "notes"), actorId: user.id,
    });
    revalidatePath("/command-center/scorecards");
    revalidatePath("/command-center");
    if (measurement.campaignId) revalidatePath(`/command-center/campaigns/${measurement.campaignId}`);
    return { saved: "measurement" };
  });
}

export async function reviewMeasurementAction(measurementId: string, formData: FormData) {
  const returnTo = String(formData.get("returnTo") || "/command-center/scorecards");
  await runFormAction(returnTo.startsWith("/command-center") ? returnTo : "/command-center/scorecards", async () => {
    const user = await requireGrowthEditor();
    await prisma.$transaction(async (tx) => {
      const measurement = await tx.growthMeasurement.findUnique({ where: { id: measurementId }, select: { status: true, enteredById: true, reviewedAt: true } });
      if (!measurement) throw new Error("Measurement not found");
      if (measurement.reviewedAt) throw new Error("Measurement was already reviewed");
      await tx.growthMeasurement.update({ where: { id: measurementId }, data: { status: measurement.status === "UNKNOWN" ? "UNKNOWN" : "REVIEWED", reviewedById: user.id, reviewedAt: new Date() } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "growth_measurement.review", entityType: "GrowthMeasurement", entityId: measurementId, metadata: { previousStatus: measurement.status, selfReview: measurement.enteredById === user.id } } });
    });
    revalidatePath("/command-center/scorecards");
    revalidatePath("/command-center");
    return { saved: "reviewed" };
  });
}

// Campaign targets and reviews ------------------------------------------

export async function createCampaignTargetAction(campaignId: string, formData: FormData) {
  await runFormAction(`/command-center/campaigns/${campaignId}`, async () => {
    const user = await requireGrowthEditor();
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true, brands: { select: { id: true } }, activations: { select: { id: true } } } });
    if (!campaign) throw new Error("Campaign not found");
    const metricDefinitionId = required(formData, "metricDefinitionId", "Metric definition");
    const definition = await prisma.growthMetricDefinition.findUnique({ where: { id: metricDefinitionId }, select: { brandId: true, status: true, unit: true } });
    if (!definition) throw new Error("Metric definition not found");
    const brandId = str(formData, "brandId") ?? definition.brandId;
    const activationId = str(formData, "activationId");
    const periodStart = parseCentralInput(formData.get("periodStart"));
    const periodEndInclusive = parseCentralInput(formData.get("periodEnd"));
    if (!periodStart || !periodEndInclusive) throw new Error("Target period start and end are required");
    const periodEnd = inclusiveEndToExclusive(periodEndInclusive);
    const dueAt = parseCentralInput(formData.get("dueAt"));
    const { targetValue, baselineValue } = validateCampaignTarget({
      campaign: { id: campaign.id, brandIds: campaign.brands.map((brand) => brand.id), activationIds: campaign.activations.map((activation) => activation.id) },
      brandId, activationId, definition, targetValue: required(formData, "targetValue", "Target value"), baselineValue: str(formData, "baselineValue"), periodStart, periodEnd, dueAt,
    });
    const target = await prisma.campaignTarget.create({ data: { campaignId, brandId, metricDefinitionId, activationId, targetValue: new Prisma.Decimal(targetValue), baselineValue: baselineValue === null ? null : new Prisma.Decimal(baselineValue), periodStart, periodEnd, dueAt, notes: str(formData, "notes"), createdById: user.id } });
    await prisma.auditEvent.create({ data: { actorId: user.id, action: "campaign_target.create", entityType: "CampaignTarget", entityId: target.id, metadata: { campaignId, metricDefinitionId, targetValue } } });
    revalidatePath(`/command-center/campaigns/${campaignId}`);
    revalidatePath("/command-center");
    return { saved: "target" };
  });
}

export async function deleteCampaignTargetAction(targetId: string) {
  const target = await prisma.campaignTarget.findUnique({ where: { id: targetId }, select: { campaignId: true } });
  const returnTo = target ? `/command-center/campaigns/${target.campaignId}` : "/command-center/campaigns";
  await runFormAction(returnTo, async () => {
    const user = await requireGrowthEditor();
    if (!target) throw new Error("Target not found");
    await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findUnique({ where: { id: target.campaignId }, select: { status: true, _count: { select: { targets: true } } } });
      if (campaign?.status === "ACTIVE" && campaign._count.targets <= 1) throw new Error("An ACTIVE campaign must keep at least one target. Add the replacement target first.");
      await tx.campaignTarget.delete({ where: { id: targetId } });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "campaign_target.delete", entityType: "CampaignTarget", entityId: targetId, metadata: { campaignId: target.campaignId } } });
    }, { isolationLevel: "Serializable" });
    revalidatePath(returnTo);
    return { saved: "target-removed" };
  });
}

export async function addCampaignReviewAction(campaignId: string, formData: FormData) {
  await runFormAction(`/command-center/campaigns/${campaignId}`, async () => {
    const user = await requireGrowthEditor();
    const decision = z.enum(["CONTINUE", "EXPAND", "REVISE", "STOP"]).parse(formData.get("decision"));
    const learning = required(formData, "learning", "Learning");
    const links = lines(formData, "evidenceLinks");
    const measurementIds = formData.getAll("measurementIds").map(String).filter(Boolean);
    const review = await prisma.campaignReview.create({ data: { campaignId, decision, learning, reviewedById: user.id, reviewedAt: new Date(), evidence: { links, measurementIds } } });
    await prisma.auditEvent.create({ data: { actorId: user.id, action: "campaign_review.create", entityType: "CampaignReview", entityId: review.id, metadata: { campaignId, decision } } });
    revalidatePath(`/command-center/campaigns/${campaignId}`);
    revalidatePath("/command-center");
    return { saved: "review" };
  });
}

// Growth actions ---------------------------------------------------------

export async function createGrowthActionAction(formData: FormData) {
  const returnTo = String(formData.get("returnTo") || "/command-center/growth");
  await runFormAction(returnTo.startsWith("/command-center") ? returnTo : "/command-center/growth", async () => {
    const user = await requireGrowthEditor();
    const status = z.enum(["OPEN", "IN_PROGRESS", "BLOCKED"]).parse(formData.get("status") || "OPEN") as GrowthActionStatus;
    const relationshipId = str(formData, "relationshipId");
    const relationship = relationshipId ? await prisma.relationship.findUnique({ where: { id: relationshipId }, select: { nextAction: true } }) : null;
    if (relationshipId && !relationship) throw new Error("Relationship not found");
    const input = { title: required(formData, "title", "Title"), status, blocker: str(formData, "blocker"), operatorPriority: optionalInt(formData, "operatorPriority", "Priority"), relationship };
    validateGrowthAction(input);
    const action = await prisma.growthAction.create({ data: {
      title: input.title, status, blocker: input.blocker, operatorPriority: input.operatorPriority, ownerId: str(formData, "ownerId") ?? user.id,
      brandId: str(formData, "brandId"), campaignId: str(formData, "campaignId"), relationshipId, dueAt: parseCentralInput(formData.get("dueAt")),
      rationale: str(formData, "rationale"), evidence: str(formData, "evidence"), createdById: user.id,
    } });
    await prisma.auditEvent.create({ data: { actorId: user.id, action: "growth_action.create", entityType: "GrowthAction", entityId: action.id, metadata: { status, operatorPriority: input.operatorPriority } } });
    revalidatePath("/command-center");
    revalidatePath("/command-center/growth");
    return { saved: "action" };
  });
}

export async function updateGrowthActionAction(actionId: string, formData: FormData) {
  const returnTo = String(formData.get("returnTo") || "/command-center/growth");
  await runFormAction(returnTo.startsWith("/command-center") ? returnTo : "/command-center/growth", async () => {
    const user = await requireGrowthEditor();
    const current = await prisma.growthAction.findUnique({ where: { id: actionId }, include: { relationship: { select: { nextAction: true } } } });
    if (!current) throw new Error("Action not found");
    const status = z.enum(["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"]).parse(formData.get("status") || current.status) as GrowthActionStatus;
    const blocker = formData.has("blocker") ? str(formData, "blocker") : current.blocker;
    const operatorPriority = formData.has("operatorPriority") ? optionalInt(formData, "operatorPriority", "Priority") : current.operatorPriority;
    validateGrowthAction({ title: current.title, status, blocker, operatorPriority, relationship: null });
    const completedAt = completedAtFor(current.status as GrowthActionStatus, status, current.completedAt, new Date());
    await prisma.growthAction.update({ where: { id: actionId }, data: { status, blocker, operatorPriority, completedAt } });
    await prisma.auditEvent.create({ data: { actorId: user.id, action: "growth_action.update", entityType: "GrowthAction", entityId: actionId, metadata: { previousStatus: current.status, status, operatorPriority } } });
    revalidatePath("/command-center");
    revalidatePath("/command-center/growth");
  });
}

// Relationships ----------------------------------------------------------

export async function updateRelationshipOperatingAction(relationshipId: string, formData: FormData) {
  await runFormAction(`/command-center/relationships/${relationshipId}`, async () => {
    const user = await requireGrowthEditor();
    const priority = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).nullable().parse(str(formData, "priority"));
    const campaignIds = [...new Set(formData.getAll("campaignIds").map(String).filter(Boolean))];
    await prisma.$transaction(async (tx) => {
      const current = await tx.relationship.findUnique({ where: { id: relationshipId }, select: { id: true, campaignLinks: { select: { campaignId: true } } } });
      if (!current) throw new Error("Relationship not found");
      const existing = new Set(current.campaignLinks.map((link) => link.campaignId));
      const keep = new Set(campaignIds);
      await tx.relationship.update({ where: { id: relationshipId }, data: {
        ownerId: str(formData, "ownerId"), fitReason: str(formData, "fitReason"), offer: str(formData, "offer"), audience: str(formData, "audience"),
        priority, priorityEvidence: str(formData, "priorityEvidence"), nextAction: str(formData, "nextAction"), nextFollowUpAt: parseCentralInput(formData.get("nextFollowUpAt")),
        commitment: str(formData, "commitment"), outcome: str(formData, "outcome"),
      } });
      const removed = [...existing].filter((id) => !keep.has(id));
      const added = campaignIds.filter((id) => !existing.has(id));
      if (removed.length) await tx.relationshipCampaign.deleteMany({ where: { relationshipId, campaignId: { in: removed } } });
      if (added.length) await tx.relationshipCampaign.createMany({ data: added.map((campaignId) => ({ relationshipId, campaignId, source: "OPERATOR" })), skipDuplicates: true });
      await tx.auditEvent.create({ data: { actorId: user.id, action: "relationship.operating.update", entityType: "Relationship", entityId: relationshipId, metadata: { campaignsAdded: added.length, campaignsRemoved: removed.length, priority } } });
    });
    revalidatePath(`/command-center/relationships/${relationshipId}`);
    revalidatePath("/command-center/relationships");
    revalidatePath("/command-center");
  });
}

// Manual publishing ------------------------------------------------------

export async function verifyDestinationIdentityAction(accountId: string, formData: FormData) {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId }, select: { brandId: true } });
  const returnTo = String(formData.get("returnTo") || (account ? `/command-center/brands/${account.brandId}` : "/command-center/settings/integrations"));
  await runFormAction(returnTo.startsWith("/command-center") ? returnTo : "/command-center/settings/integrations", async () => {
    const user = await requireGrowthEditor();
    if (!account) throw new Error("Account not found");
    const profileUrl = str(formData, "profileUrl");
    const handle = str(formData, "handle");
    const source = required(formData, "verificationSource", "Verification source");
    if (!profileUrl && !handle) throw new Error("A verified profile URL or handle is required");
    if (profileUrl && !/^https:\/\//i.test(profileUrl)) throw new Error("Profile URL must use https");
    const verifiedAt = parseCentralInput(formData.get("verifiedAt")) ?? new Date();
    if (verifiedAt.getTime() > Date.now() + 5 * 60_000) throw new Error("Verification time cannot be in the future");
    await prisma.$transaction(async (tx) => {
      await tx.socialAccount.update({ where: { id: accountId }, data: { profileUrl: profileUrl ?? undefined, handle: handle ?? undefined, metadataVerifiedAt: verifiedAt } });
      await writeSocialAuditEvent(tx, { actorId: user.id, action: "social_account.identity.verify", entityType: "SocialAccount", entityId: accountId, metadata: { method: "MANUAL", source, verifiedAt: verifiedAt.toISOString(), hasProfileUrl: Boolean(profileUrl), hasHandle: Boolean(handle) } });
    });
    revalidatePath(returnTo);
    revalidatePath("/command-center/queue");
    return { saved: "verified" };
  });
}

export async function prepareManualHandoffAction(draftId: string, formData: FormData) {
  await runFormAction(`/command-center/queue/${draftId}/publish`, async () => {
    const user = await requireGrowthEditor();
    await prepareManualHandoffTx(prisma, { draftId, socialAccountId: required(formData, "socialAccountId", "Destination"), plannedFor: parseCentralInput(formData.get("plannedFor")), actorId: user.id });
    revalidatePath("/command-center/queue");
    revalidatePath("/command-center");
    return { saved: "handoff" };
  });
}

export async function confirmManualPublicationAction(draftId: string, formData: FormData) {
  await runFormAction(`/command-center/queue/${draftId}/publish`, async () => {
    const user = await requireGrowthEditor();
    const result = await confirmManualPublicationTx(prisma, {
      draftId, platformUrl: required(formData, "platformUrl", "Published URL"), publishedAt: parseCentralInput(formData.get("publishedAt")),
      platformPostId: str(formData, "platformPostId"), confirmationNote: str(formData, "confirmationNote"), actorId: user.id,
    });
    revalidatePath("/command-center/queue");
    revalidatePath("/command-center");
    return { saved: result.outcome === "PUBLISHED" ? "published" : "already-recorded" };
  });
}
