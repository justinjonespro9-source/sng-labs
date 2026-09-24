"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { assertContentTransition, canDeleteContent, canDeleteOpportunity, hasSubstantiveContentChange, statusAfterContentEdit, type ContentStatus } from "@/lib/command-center/content-workflow";
import { mergeActivationContext } from "@/lib/command-center/campaign-workflow";
import { parseContentModes, parseLines } from "@/lib/command-center/brand-brain";
import { prisma } from "@/lib/prisma";
import { writeSocialAuditEvent } from "@/lib/social-accounts/audit";

const text = z.string().trim().min(1).max(500);
const optionalText = z.string().trim().max(5000).optional().transform((value) => value || null);

async function requireEditor() {
  const user = await requireCommandCenterUser();
  if (!new Set(["OWNER", "ADMIN", "EDITOR"]).has(user.role)) throw new Error("Forbidden");
  return user;
}

function ids(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

function lines(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").split("\n").map((value) => value.trim()).filter(Boolean);
}

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw) : null;
}

async function audit(actorId: string, action: string, entityType: string, entityId: string, metadata?: Record<string, string | number | boolean | null>) {
  await prisma.auditEvent.create({ data: { actorId, action, entityType, entityId, metadata } });
}

export async function createMarket(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, key: z.string().trim().min(2).max(80), region: optionalText, notes: optionalText }).parse({
    name: formData.get("name"), key: formData.get("key"), region: formData.get("region"), notes: formData.get("notes"),
  });
  const market = await prisma.market.create({ data: input });
  await audit(user.id, "market.create", "Market", market.id);
  revalidatePath("/command-center/markets");
}

export async function createTeam(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, key: z.string().trim().min(2).max(80), marketId: text, sport: text, league: text, venueName: optionalText }).parse({
    name: formData.get("name"), key: formData.get("key"), marketId: formData.get("marketId"), sport: formData.get("sport"), league: formData.get("league"), venueName: formData.get("venueName"),
  });
  const team = await prisma.team.create({ data: { ...input, brands: { connect: ids(formData, "brandIds").map((id) => ({ id })) } } });
  await audit(user.id, "team.create", "Team", team.id);
  revalidatePath("/command-center/markets");
}

export async function createCampaign(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, programId: optionalText, description: optionalText, objective: optionalText, objectiveType: z.enum(["USER_ACQUISITION", "PARTICIPATION", "RETENTION", "BRAND_AWARENESS", "CREATOR_ACTIVATION", "MEDIA_EARNED", "PARTNERSHIP", "INDUSTRY_OUTREACH", "PRODUCT_VALIDATION", "OTHER"]), primaryAudience: optionalText, primaryCta: optionalText, coreMessage: optionalText, sport: optionalText, season: optionalText, notes: optionalText, successDefinition: optionalText, status: z.enum(["PLANNING", "ACTIVE", "PAUSED", "COMPLETE", "ARCHIVED"]) }).parse({
    name: formData.get("name"), programId: String(formData.get("programId") ?? ""), description: String(formData.get("description") ?? ""), objective: String(formData.get("objective") ?? ""), objectiveType: formData.get("objectiveType"), primaryAudience: String(formData.get("primaryAudience") ?? ""), primaryCta: String(formData.get("primaryCta") ?? ""), coreMessage: String(formData.get("coreMessage") ?? ""), sport: String(formData.get("sport") ?? ""), season: String(formData.get("season") ?? ""), notes: String(formData.get("notes") ?? ""), successDefinition: String(formData.get("successDefinition") ?? ""), status: formData.get("status"),
  });
  const campaign = await prisma.campaign.create({ data: {
    ...input, active: input.status !== "ARCHIVED", kpis: lines(formData, "kpis"),
    startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")),
    brands: { connect: ids(formData, "brandIds").map((id) => ({ id })) },
    markets: { connect: ids(formData, "marketIds").map((id) => ({ id })) },
    teams: { connect: ids(formData, "teamIds").map((id) => ({ id })) },
  } });
  await audit(user.id, "campaign.create", "Campaign", campaign.id);
  revalidatePath("/command-center/campaigns");
  redirect(`/command-center/campaigns/${campaign.id}`);
}

export async function createOpportunity(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ title: text, summary: z.string().trim().min(1).max(5000), whyItMatters: optionalText, sourceLabel: optionalText, actionRecommendation: optionalText }).parse({
    title: formData.get("title"), summary: formData.get("summary"), whyItMatters: formData.get("whyItMatters"), sourceLabel: formData.get("sourceLabel"), actionRecommendation: formData.get("actionRecommendation"),
  });
  const urgency = z.coerce.number().int().min(0).max(100).parse(formData.get("urgency") ?? 50);
  const activationId = String(formData.get("activationId") ?? "").trim() || null;
  const activation = activationId ? await prisma.campaignActivation.findUnique({ where: { id: activationId }, select: { id: true, campaignId: true, marketId: true, teamId: true } }) : null;
  if (activationId && !activation) throw new Error("Activation not found");
  const { marketIds, teamIds, campaignIds } = mergeActivationContext({ marketIds: ids(formData, "marketIds"), teamIds: ids(formData, "teamIds"), campaignIds: ids(formData, "campaignIds") }, activation);
  const opportunity = await prisma.opportunity.create({ data: {
    ...input, urgency, activationId, recommendedAt: optionalDate(formData.get("recommendedAt")),
    markets: { connect: marketIds.map((id) => ({ id })) },
    teams: { connect: teamIds.map((id) => ({ id })) },
    campaigns: { create: campaignIds.map((campaignId) => ({ campaignId })) },
  } });
  await audit(user.id, "opportunity.create", "Opportunity", opportunity.id);
  revalidatePath("/command-center/opportunities");
  revalidatePath("/command-center");
}

export async function createOrganization(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, type: z.enum(["MEDIA", "TEAM", "CREATOR_NETWORK", "CREATOR", "PODCAST", "VENUE", "PARTNER", "AGENCY", "INVESTOR", "OTHER"]), marketId: optionalText, websiteUrl: optionalText, notes: optionalText }).parse({
    name: formData.get("name"), type: formData.get("type"), marketId: formData.get("marketId"), websiteUrl: formData.get("websiteUrl"), notes: formData.get("notes"),
  });
  const organization = await prisma.organization.create({ data: {
    ...input, relevantBrands: { connect: ids(formData, "brandIds").map((id) => ({ id })) },
  } });
  await audit(user.id, "organization.create", "Organization", organization.id);
  revalidatePath("/command-center/relationships");
}

export async function createRelationship(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, organizationId: text, contactName: z.string().trim().max(200).optional(), contactTitle: z.string().trim().max(200).optional(), summary: optionalText }).parse({
    name: formData.get("name"), organizationId: formData.get("organizationId"), contactName: String(formData.get("contactName") ?? ""), contactTitle: String(formData.get("contactTitle") ?? ""), summary: formData.get("summary"),
  });
  const contact = input.contactName ? await prisma.contact.create({ data: { name: input.contactName, title: input.contactTitle || null, organizationId: input.organizationId } }) : null;
  const relationship = await prisma.relationship.create({ data: {
    name: input.name, organizationId: input.organizationId, contactId: contact?.id, ownerId: user.id, summary: input.summary,
    nextFollowUpAt: optionalDate(formData.get("nextFollowUpAt")),
    relevantBrands: { connect: ids(formData, "brandIds").map((id) => ({ id })) },
  } });
  await audit(user.id, "relationship.create", "Relationship", relationship.id);
  revalidatePath("/command-center/relationships");
}

export async function updateBrandProfile(brandId: string, formData: FormData) {
  const user = await requireEditor();
  const split = (key: string) => String(formData.get(key) ?? "").split("\n").map((value) => value.trim()).filter(Boolean);
  const input = z.object({ shortName: optionalText, description: z.string().trim().min(1).max(5000), purpose: optionalText, coreProposition: optionalText, audience: z.string().trim().min(1).max(5000), voice: z.string().trim().min(1).max(5000), callToActionRules: z.string().trim().min(1).max(5000), defaultCadenceNotes: z.string().trim().min(1).max(5000) }).parse({
    shortName: formData.get("shortName"), description: formData.get("description"), purpose: formData.get("purpose"), coreProposition: formData.get("coreProposition"), audience: formData.get("audience"), voice: formData.get("voice"), callToActionRules: formData.get("callToActionRules"), defaultCadenceNotes: formData.get("defaultCadenceNotes"),
  });
  await prisma.brand.update({ where: { id: brandId }, data: { ...input, objectives: split("objectives"), contentPillars: split("contentPillars"), primaryCtas: split("primaryCtas"), relevantUrls: split("relevantUrls"), preferredContent: split("preferredContent"), prohibitedContent: split("prohibitedContent"), terminology: { notes: split("terminology") }, active: formData.get("active") === "on" } });
  await audit(user.id, "brand.update", "Brand", brandId);
  revalidatePath("/command-center/brands");
}

export async function updateBrandBrain(brandId: string, formData: FormData) {
  const user = await requireEditor();
  const input = z.object({
    purpose: z.string().trim().min(1).max(5000),
    corePromise: z.string().trim().min(1).max(5000),
    coreProposition: z.string().trim().min(1).max(5000),
    audience: z.string().trim().min(1).max(5000),
    voice: z.string().trim().min(1).max(5000),
  }).parse({
    purpose: formData.get("purpose"),
    corePromise: formData.get("corePromise"),
    coreProposition: formData.get("coreProposition"),
    audience: formData.get("audience"),
    voice: formData.get("voice"),
  });
  const contentModes = parseContentModes(formData.get("contentModes"));
  if (!contentModes.length) throw new Error("At least one content mode with a name and goal is required");
  const contentPillars = parseLines(formData.get("contentPillars"));
  const aiOperatingInstructions = parseLines(formData.get("aiOperatingInstructions"));
  if (!contentPillars.length || !aiOperatingInstructions.length) throw new Error("Messaging pillars and AI operating instructions are required");
  await prisma.brand.update({
    where: { id: brandId },
    data: {
      ...input,
      secondaryAudiences: parseLines(formData.get("secondaryAudiences")),
      distributionAudiences: parseLines(formData.get("distributionAudiences")),
      jobsToBeDone: parseLines(formData.get("jobsToBeDone")),
      contentPillars,
      voiceTraits: parseLines(formData.get("voiceTraits")),
      communicationPatterns: parseLines(formData.get("communicationPatterns")),
      contentModes,
      prohibitedContent: parseLines(formData.get("prohibitedContent")),
      factualRequirements: parseLines(formData.get("factualRequirements")),
      affiliationRestrictions: parseLines(formData.get("affiliationRestrictions")),
      aiOperatingInstructions,
      primaryCtas: parseLines(formData.get("primaryCtas")),
      callToActionRules: String(formData.get("callToActionRules") ?? "").trim(),
      brandBrainVersion: 1,
      brandBrainConfiguredAt: new Date(),
    },
  });
  await audit(user.id, "brand.brain.update", "Brand", brandId, { version: 1 });
  revalidatePath("/command-center/brands");
  revalidatePath(`/command-center/brands/${brandId}`);
  redirect(`/command-center/brands/${brandId}`);
}

export async function updateOpportunityStatus(opportunityId: string, formData: FormData) {
  const user = await requireEditor();
  const status = z.enum(["NEW", "REVIEWED", "DEVELOPING", "QUEUED", "COMPLETE", "NO_POST", "DISMISSED"]).parse(formData.get("status"));
  await prisma.opportunity.update({ where: { id: opportunityId }, data: { status, noPostRationale: status === "NO_POST" ? String(formData.get("noPostRationale") || "Not worth publishing now") : undefined } });
  await audit(user.id, "opportunity.status", "Opportunity", opportunityId, { status });
  revalidatePath("/command-center/opportunities");
  revalidatePath("/command-center");
}

export async function updateOpportunity(opportunityId: string, formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ title: text, summary: z.string().trim().min(1).max(5000), whyItMatters: optionalText, sourceLabel: optionalText, actionRecommendation: optionalText, status: z.enum(["NEW", "REVIEWED", "DEVELOPING", "QUEUED", "COMPLETE", "NO_POST", "DISMISSED"]) }).parse({
    title: formData.get("title"), summary: formData.get("summary"), whyItMatters: String(formData.get("whyItMatters") ?? ""), sourceLabel: String(formData.get("sourceLabel") ?? ""), actionRecommendation: String(formData.get("actionRecommendation") ?? ""), status: formData.get("status"),
  });
  const urgency = z.coerce.number().int().min(0).max(100).parse(formData.get("urgency") ?? 50);
  const current = await prisma.opportunity.findUnique({ where: { id: opportunityId }, select: { activation: { select: { campaignId: true, marketId: true, teamId: true } } } });
  if (!current) throw new Error("Opportunity not found");
  const { campaignIds, marketIds, teamIds } = mergeActivationContext({ campaignIds: ids(formData, "campaignIds"), marketIds: ids(formData, "marketIds"), teamIds: ids(formData, "teamIds") }, current.activation);
  await prisma.opportunity.update({ where: { id: opportunityId }, data: {
    ...input,
    urgency,
    recommendedAt: optionalDate(formData.get("recommendedAt")),
    noPostRationale: input.status === "NO_POST" ? String(formData.get("noPostRationale") || "Not worth publishing now") : null,
    markets: { set: marketIds.map((id) => ({ id })) },
    teams: { set: teamIds.map((id) => ({ id })) },
    campaigns: { deleteMany: {}, create: campaignIds.map((campaignId) => ({ campaignId })) },
  } });
  await audit(user.id, "opportunity.edit", "Opportunity", opportunityId);
  revalidatePath("/command-center/opportunities");
  revalidatePath(`/command-center/opportunities/${opportunityId}/edit`);
  revalidatePath("/command-center");
  redirect("/command-center/opportunities");
}

export async function deleteOpportunity(opportunityId: string) {
  const user = await requireEditor();
  await prisma.$transaction(async (tx) => {
    const opportunity = await tx.opportunity.findUnique({ where: { id: opportunityId }, select: { angles: { select: { _count: { select: { drafts: true } } } } } });
    if (!opportunity) throw new Error("Opportunity not found");
    const contentCount = opportunity.angles.reduce((sum, angle) => sum + angle._count.drafts, 0);
    if (!canDeleteOpportunity(contentCount)) throw new Error("This Opportunity has linked Content. Dismiss it instead of deleting it.");
    await tx.opportunity.delete({ where: { id: opportunityId } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "opportunity.delete", entityType: "Opportunity", entityId: opportunityId, metadata: { contentCount } } });
  }, { isolationLevel: "Serializable" });
  revalidatePath("/command-center/opportunities");
  revalidatePath("/command-center");
}

export async function createContentFromOpportunity(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ opportunityId: text, brandId: text, objective: text, hook: text, rationale: text, body: z.string().trim().min(1).max(20000), callToAction: optionalText, visualBrief: optionalText, socialAccountId: optionalText }).parse({
    opportunityId: formData.get("opportunityId"), brandId: formData.get("brandId"), objective: formData.get("objective"), hook: formData.get("hook"), rationale: formData.get("rationale"), body: formData.get("body"), callToAction: formData.get("callToAction"), visualBrief: formData.get("visualBrief"), socialAccountId: String(formData.get("socialAccountId") ?? ""),
  });
  const [opportunityExists, brand] = await Promise.all([
    prisma.opportunity.findUnique({ where: { id: input.opportunityId }, select: { id: true } }),
    prisma.brand.findFirst({ where: { id: input.brandId, active: true }, select: { id: true } }),
  ]);
  if (!opportunityExists) throw new Error("Opportunity not found");
  if (!brand) throw new Error("Choose an active canonical brand");
  const draft = await prisma.$transaction(async (tx) => {
    const angle = await tx.brandAngle.upsert({
      where: { opportunityId_brandId: { opportunityId: input.opportunityId, brandId: input.brandId } },
      update: { objective: input.objective, hook: input.hook, rationale: input.rationale, suggestedVisual: input.visualBrief },
      create: { opportunityId: input.opportunityId, brandId: input.brandId, objective: input.objective, hook: input.hook, rationale: input.rationale, suggestedVisual: input.visualBrief },
    });
    const created = await tx.contentDraft.create({ data: { brandAngleId: angle.id, socialAccountId: input.socialAccountId, objective: input.objective, hook: input.hook, rationale: input.rationale, body: input.body, callToAction: input.callToAction, visualBrief: input.visualBrief } });
    await tx.opportunity.update({ where: { id: input.opportunityId }, data: { status: "DEVELOPING" } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "content.create", entityType: "ContentDraft", entityId: created.id } });
    return created;
  });
  redirect(`/command-center/queue?created=${draft.id}`);
}

export async function updateDraftStatus(draftId: string, formData: FormData) {
  const user = await requireEditor();
  const status = z.enum(["DRAFT", "NEEDS_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED", "ARCHIVED"]).parse(formData.get("status"));
  const comment = String(formData.get("comment") || "").trim() || null;
  if (status === "REVISION_REQUESTED" && !comment) throw new Error("Revision notes are required");
  await prisma.$transaction(async (tx) => {
    const current = await tx.contentDraft.findUnique({ where: { id: draftId }, select: { status: true, publication: { select: { id: true } } } });
    if (!current) throw new Error("Content not found");
    assertContentTransition(current.status as ContentStatus, status);
    const action = status === "NEEDS_REVIEW"
      ? current.status === "REVISION_REQUESTED" ? "content.resubmit_review" : "content.submit_review"
      : `content.${status.toLowerCase()}`;
    await tx.contentDraft.update({ where: { id: draftId }, data: { status } });
    if (status === "ARCHIVED" && current.publication) await tx.publication.update({ where: { draftId }, data: { status: "CANCELLED" } });
    if (["APPROVED", "REVISION_REQUESTED", "REJECTED"].includes(status)) await tx.approval.create({ data: { draftId, reviewerId: user.id, decision: status as "APPROVED" | "REVISION_REQUESTED" | "REJECTED", comment } });
    await tx.auditEvent.create({ data: { actorId: user.id, action, entityType: "ContentDraft", entityId: draftId, metadata: { previousStatus: current.status, nextStatus: status, ...(comment ? { comment } : {}) } } });
  });
  revalidatePath("/command-center/queue");
  revalidatePath("/command-center");
}

export async function updateContentDraft(draftId: string, formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ brandId: text, objective: text, hook: text, rationale: text, body: z.string().trim().min(1).max(20000), callToAction: optionalText, visualBrief: optionalText, socialAccountId: optionalText }).parse({
    brandId: formData.get("brandId"), objective: formData.get("objective"), hook: formData.get("hook"), rationale: formData.get("rationale"), body: formData.get("body"), callToAction: String(formData.get("callToAction") ?? ""), visualBrief: String(formData.get("visualBrief") ?? ""), socialAccountId: String(formData.get("socialAccountId") ?? ""),
  });
  const scheduledFor = optionalDate(formData.get("scheduledFor"));
  await prisma.$transaction(async (tx) => {
    const current = await tx.contentDraft.findUnique({ where: { id: draftId }, include: { brandAngle: true, socialAccount: true, publication: true } });
    if (!current) throw new Error("Content not found");
    const brand = await tx.brand.findFirst({ where: { id: input.brandId, active: true }, select: { id: true } });
    if (!brand) throw new Error("Choose an active canonical brand");
    if (input.socialAccountId) {
      const account = await tx.socialAccount.findFirst({ where: { id: input.socialAccountId, brandId: input.brandId, connectionStatus: "CONNECTED" }, select: { id: true } });
      if (!account) throw new Error("Choose a connected account owned by the selected brand");
    }
    const nextSubstantive = { brandId: input.brandId, objective: input.objective, hook: input.hook, rationale: input.rationale, body: input.body, visualBrief: input.visualBrief, callToAction: input.callToAction };
    const substantiveChange = hasSubstantiveContentChange({ brandId: current.brandAngle.brandId, objective: current.objective, hook: current.hook, rationale: current.rationale, body: current.body, visualBrief: current.visualBrief, callToAction: current.callToAction }, nextSubstantive);
    const nextStatus = statusAfterContentEdit(current.status as ContentStatus, substantiveChange);
    let brandAngleId = current.brandAngleId;
    if (current.brandAngle.brandId !== input.brandId) {
      const angle = await tx.brandAngle.upsert({ where: { opportunityId_brandId: { opportunityId: current.brandAngle.opportunityId, brandId: input.brandId } }, update: {}, create: { opportunityId: current.brandAngle.opportunityId, brandId: input.brandId, objective: input.objective, hook: input.hook, rationale: input.rationale, suggestedVisual: input.visualBrief } });
      brandAngleId = angle.id;
    }
    const approvalInvalidated = nextStatus === "NEEDS_REVIEW" && ["APPROVED", "READY"].includes(current.status);
    await tx.contentDraft.update({ where: { id: draftId }, data: { brandAngleId, objective: input.objective, hook: input.hook, rationale: input.rationale, body: input.body, visualBrief: input.visualBrief, callToAction: input.callToAction, socialAccountId: input.socialAccountId, scheduledFor: approvalInvalidated ? null : scheduledFor, status: nextStatus } });
    if (current.publication) {
      if (approvalInvalidated) await tx.publication.update({ where: { draftId }, data: { status: "CANCELLED", scheduledFor: null } });
      else if (nextStatus === "READY" && input.socialAccountId && scheduledFor) await tx.publication.update({ where: { draftId }, data: { socialAccountId: input.socialAccountId, scheduledFor, status: "PLANNED" } });
    }
    await tx.auditEvent.create({ data: { actorId: user.id, action: "content.edit", entityType: "ContentDraft", entityId: draftId, metadata: { substantiveChange, approvalInvalidated, previousStatus: current.status, nextStatus } } });
  });
  revalidatePath("/command-center/queue");
  revalidatePath(`/command-center/queue/${draftId}/edit`);
  revalidatePath("/command-center");
  redirect(`/command-center/queue?updated=${draftId}`);
}

export async function deleteContentDraft(draftId: string) {
  const user = await requireEditor();
  await prisma.$transaction(async (tx) => {
    const draft = await tx.contentDraft.findUnique({ where: { id: draftId }, select: { status: true, publication: { select: { id: true } } } });
    if (!draft) throw new Error("Content not found");
    if (!canDeleteContent(draft.status as ContentStatus, Boolean(draft.publication))) throw new Error("Only unscheduled Draft content can be deleted. Archive this item instead.");
    await tx.contentDraft.delete({ where: { id: draftId } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "content.delete", entityType: "ContentDraft", entityId: draftId } });
  });
  revalidatePath("/command-center/queue");
  revalidatePath("/command-center");
}

export async function scheduleDraft(draftId: string, formData: FormData) {
  const user = await requireEditor();
  const socialAccountId = text.parse(formData.get("socialAccountId"));
  const scheduledFor = optionalDate(formData.get("scheduledFor"));
  if (!scheduledFor) throw new Error("A publish time is required");
  await prisma.$transaction(async (tx) => {
    const draft = await tx.contentDraft.findUnique({ where: { id: draftId }, include: { brandAngle: { select: { brandId: true } } } });
    if (!draft) throw new Error("Content not found");
    assertContentTransition(draft.status as ContentStatus, "READY");
    const account = await tx.socialAccount.findFirst({ where: { id: socialAccountId, brandId: draft.brandAngle.brandId, connectionStatus: "CONNECTED" }, select: { id: true } });
    if (!account) throw new Error("A connected social account for this brand is required");
    await tx.contentDraft.update({ where: { id: draftId }, data: { status: "READY", socialAccountId, scheduledFor } });
    await tx.publication.upsert({ where: { draftId }, update: { socialAccountId, scheduledFor, status: "PLANNED" }, create: { draftId, socialAccountId, scheduledFor } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "content.schedule", entityType: "ContentDraft", entityId: draftId, metadata: { scheduledFor: scheduledFor.toISOString() } } });
  });
  revalidatePath("/command-center/queue");
  revalidatePath("/command-center");
}

export async function unscheduleDraft(draftId: string) {
  const user = await requireEditor();
  await prisma.$transaction(async (tx) => {
    const draft = await tx.contentDraft.findUnique({ where: { id: draftId }, select: { status: true, publication: { select: { id: true } } } });
    if (!draft) throw new Error("Content not found");
    assertContentTransition(draft.status as ContentStatus, "APPROVED");
    await tx.contentDraft.update({ where: { id: draftId }, data: { status: "APPROVED", scheduledFor: null } });
    if (draft.publication) await tx.publication.update({ where: { draftId }, data: { status: "CANCELLED", scheduledFor: null } });
    await tx.auditEvent.create({ data: { actorId: user.id, action: "content.unschedule", entityType: "ContentDraft", entityId: draftId } });
  });
  revalidatePath("/command-center/queue");
  revalidatePath("/command-center");
}

export async function addRelationshipActivity(relationshipId: string, formData: FormData) {
  const user = await requireEditor();
  const type = z.enum(["EMAIL", "DM", "CALL", "MEETING", "NOTE", "FOLLOW_UP", "OTHER"]).parse(formData.get("type"));
  const summary = z.string().trim().min(1).max(5000).parse(formData.get("summary"));
  const nextStep = String(formData.get("nextStep") || "").trim() || null;
  let campaignId = String(formData.get("campaignId") || "").trim() || null;
  const activationId = String(formData.get("activationId") || "").trim() || null;
  const executionType = z.enum(["ORGANIC_SOCIAL", "CREATOR_OUTREACH", "MEDIA_OUTREACH", "COMMUNITY", "PARTNERSHIP", "PAID", "PRODUCT_EVENT", "OTHER"]).optional().parse(String(formData.get("executionType") || "").trim() || undefined);
  const occurredAt = optionalDate(formData.get("occurredAt")) ?? new Date();
  if (activationId) {
    const activation = await prisma.campaignActivation.findUnique({ where: { id: activationId }, select: { campaignId: true } });
    if (!activation) throw new Error("Activation not found");
    if (campaignId && campaignId !== activation.campaignId) throw new Error("Activation does not belong to the selected campaign");
    campaignId = activation.campaignId;
  }
  await prisma.$transaction([
    prisma.relationshipActivity.create({ data: { relationshipId, type, summary, nextStep, occurredAt, campaignId, activationId, executionType } }),
    prisma.relationship.update({ where: { id: relationshipId }, data: { lastOutreachAt: type === "NOTE" ? undefined : occurredAt, nextFollowUpAt: optionalDate(formData.get("nextFollowUpAt")) } }),
    ...(activationId ? [prisma.campaignActivation.update({ where: { id: activationId }, data: { relationships: { connect: { id: relationshipId } } } })] : []),
  ]);
  await audit(user.id, "relationship.activity", "Relationship", relationshipId);
  revalidatePath(`/command-center/relationships/${relationshipId}`);
  revalidatePath("/command-center/relationships");
}

export async function updateRelationshipStage(relationshipId: string, formData: FormData) {
  const user = await requireEditor();
  const stage = z.enum(["PROSPECT", "CONTACTED", "CONVERSATION", "OPPORTUNITY", "PARTNER", "CLOSED", "NOT_PURSUING"]).parse(formData.get("stage"));
  await prisma.relationship.update({ where: { id: relationshipId }, data: { stage } });
  await audit(user.id, "relationship.stage", "Relationship", relationshipId);
  revalidatePath("/command-center/relationships");
  revalidatePath(`/command-center/relationships/${relationshipId}`);
}

export async function updateCampaignStatus(campaignId: string, formData: FormData) {
  const user = await requireEditor();
  const status = z.enum(["PLANNING", "ACTIVE", "PAUSED", "COMPLETE", "ARCHIVED"]).parse(formData.get("status"));
  await prisma.campaign.update({ where: { id: campaignId }, data: { status, active: status !== "ARCHIVED" } });
  await audit(user.id, "campaign.status", "Campaign", campaignId);
  revalidatePath("/command-center/campaigns");
  revalidatePath(`/command-center/campaigns/${campaignId}`);
  revalidatePath("/command-center");
}

export async function updateCampaign(campaignId: string, formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, programId: optionalText, description: optionalText, objective: optionalText, objectiveType: z.enum(["USER_ACQUISITION", "PARTICIPATION", "RETENTION", "BRAND_AWARENESS", "CREATOR_ACTIVATION", "MEDIA_EARNED", "PARTNERSHIP", "INDUSTRY_OUTREACH", "PRODUCT_VALIDATION", "OTHER"]), primaryAudience: optionalText, primaryCta: optionalText, coreMessage: optionalText, sport: optionalText, season: optionalText, notes: optionalText, successDefinition: optionalText, status: z.enum(["PLANNING", "ACTIVE", "PAUSED", "COMPLETE", "ARCHIVED"]) }).parse({
    name: formData.get("name"), programId: String(formData.get("programId") ?? ""), description: String(formData.get("description") ?? ""), objective: String(formData.get("objective") ?? ""), objectiveType: formData.get("objectiveType"), primaryAudience: String(formData.get("primaryAudience") ?? ""), primaryCta: String(formData.get("primaryCta") ?? ""), coreMessage: String(formData.get("coreMessage") ?? ""), sport: String(formData.get("sport") ?? ""), season: String(formData.get("season") ?? ""), notes: String(formData.get("notes") ?? ""), successDefinition: String(formData.get("successDefinition") ?? ""), status: formData.get("status"),
  });
  await prisma.campaign.update({ where: { id: campaignId }, data: { ...input, active: input.status !== "ARCHIVED", startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")), kpis: lines(formData, "kpis"), brands: { set: ids(formData, "brandIds").map((id) => ({ id })) }, markets: { set: ids(formData, "marketIds").map((id) => ({ id })) }, teams: { set: ids(formData, "teamIds").map((id) => ({ id })) } } });
  await audit(user.id, "campaign.edit", "Campaign", campaignId);
  revalidatePath("/command-center/campaigns");
  revalidatePath(`/command-center/campaigns/${campaignId}`);
  redirect(`/command-center/campaigns/${campaignId}`);
}

export async function createActivation(campaignId: string, formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, status: z.enum(["PLANNED", "READY", "ACTIVE", "COMPLETE", "PAUSED", "ARCHIVED"]), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), marketId: optionalText, teamId: optionalText, eventId: optionalText, venueName: optionalText, sport: optionalText, season: optionalText, audienceSegment: optionalText, coreMessage: optionalText, callToAction: optionalText, objective: optionalText, slateLabel: optionalText, notes: optionalText }).parse({
    name: formData.get("name"), status: formData.get("status"), priority: formData.get("priority"), marketId: String(formData.get("marketId") ?? ""), teamId: String(formData.get("teamId") ?? ""), eventId: String(formData.get("eventId") ?? ""), venueName: String(formData.get("venueName") ?? ""), sport: String(formData.get("sport") ?? ""), season: String(formData.get("season") ?? ""), audienceSegment: String(formData.get("audienceSegment") ?? ""), coreMessage: String(formData.get("coreMessage") ?? ""), callToAction: String(formData.get("callToAction") ?? ""), objective: String(formData.get("objective") ?? ""), slateLabel: String(formData.get("slateLabel") ?? ""), notes: String(formData.get("notes") ?? ""),
  });
  const weekRaw = String(formData.get("week") ?? "").trim();
  const activation = await prisma.campaignActivation.create({ data: { ...input, campaignId, week: weekRaw ? z.coerce.number().int().min(1).max(99).parse(weekRaw) : null, startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")), brands: { connect: ids(formData, "brandIds").map((id) => ({ id })) }, relationships: { connect: ids(formData, "relationshipIds").map((id) => ({ id })) } } });
  await audit(user.id, "activation.create", "CampaignActivation", activation.id, { campaignId });
  revalidatePath("/command-center/campaigns");
  revalidatePath(`/command-center/campaigns/${campaignId}`);
  redirect(`/command-center/campaigns/${campaignId}/activations/${activation.id}`);
}

export async function updateActivation(activationId: string, formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ name: text, status: z.enum(["PLANNED", "READY", "ACTIVE", "COMPLETE", "PAUSED", "ARCHIVED"]), priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), marketId: optionalText, teamId: optionalText, eventId: optionalText, venueName: optionalText, sport: optionalText, season: optionalText, audienceSegment: optionalText, coreMessage: optionalText, callToAction: optionalText, objective: optionalText, slateLabel: optionalText, notes: optionalText }).parse({
    name: formData.get("name"), status: formData.get("status"), priority: formData.get("priority"), marketId: String(formData.get("marketId") ?? ""), teamId: String(formData.get("teamId") ?? ""), eventId: String(formData.get("eventId") ?? ""), venueName: String(formData.get("venueName") ?? ""), sport: String(formData.get("sport") ?? ""), season: String(formData.get("season") ?? ""), audienceSegment: String(formData.get("audienceSegment") ?? ""), coreMessage: String(formData.get("coreMessage") ?? ""), callToAction: String(formData.get("callToAction") ?? ""), objective: String(formData.get("objective") ?? ""), slateLabel: String(formData.get("slateLabel") ?? ""), notes: String(formData.get("notes") ?? ""),
  });
  const weekRaw = String(formData.get("week") ?? "").trim();
  const activation = await prisma.campaignActivation.update({ where: { id: activationId }, data: { ...input, week: weekRaw ? z.coerce.number().int().min(1).max(99).parse(weekRaw) : null, startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")), brands: { set: ids(formData, "brandIds").map((id) => ({ id })) }, relationships: { set: ids(formData, "relationshipIds").map((id) => ({ id })) } }, select: { campaignId: true } });
  await audit(user.id, "activation.edit", "CampaignActivation", activationId);
  revalidatePath(`/command-center/campaigns/${activation.campaignId}`);
  revalidatePath(`/command-center/campaigns/${activation.campaignId}/activations/${activationId}`);
  redirect(`/command-center/campaigns/${activation.campaignId}/activations/${activationId}`);
}

export async function createKnownSocialAccount(brandId: string, formData: FormData) {
  const user = await requireEditor();
  const platform = z.enum(["X", "INSTAGRAM", "FACEBOOK", "DISCORD", "LINKEDIN", "TIKTOK", "YOUTUBE", "THREADS", "OTHER"]).parse(formData.get("platform"));
  const accountType = z.enum(["UNKNOWN", "PROFILE", "PAGE", "PROFESSIONAL_ACCOUNT", "GUILD", "CHANNEL", "WEBHOOK_DESTINATION", "OTHER"]).parse(formData.get("accountType") || "UNKNOWN");
  const handle = String(formData.get("handle") || "").trim() || null;
  const displayName = String(formData.get("displayName") || "").trim() || null;
  const profileUrl = String(formData.get("profileUrl") || "").trim() || null;
  const account = await prisma.socialAccount.create({ data: { brandId, platform, accountType, handle, displayName, profileUrl, lifecycleStatus: "KNOWN", connectionStatus: "NOT_CONNECTED", publishingMode: "MANUAL", publishingEnabled: false, analyticsEnabled: false, communityEnabled: false, autopilotAllowed: false } });
  await writeSocialAuditEvent(prisma, { actorId: user.id, action: "social_account.inventory.create", entityType: "SocialAccount", entityId: account.id, metadata: { brandId, platform, accountType } });
  revalidatePath(`/command-center/brands/${brandId}`);
  revalidatePath("/command-center/settings/integrations");
}
