"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw) : null;
}

async function audit(actorId: string, action: string, entityType: string, entityId: string) {
  await prisma.auditEvent.create({ data: { actorId, action, entityType, entityId } });
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
  const input = z.object({ name: text, description: optionalText, objective: optionalText }).parse({
    name: formData.get("name"), description: formData.get("description"), objective: formData.get("objective"),
  });
  const campaign = await prisma.campaign.create({ data: {
    ...input,
    startsAt: optionalDate(formData.get("startsAt")), endsAt: optionalDate(formData.get("endsAt")),
    brands: { connect: ids(formData, "brandIds").map((id) => ({ id })) },
    markets: { connect: ids(formData, "marketIds").map((id) => ({ id })) },
    teams: { connect: ids(formData, "teamIds").map((id) => ({ id })) },
  } });
  await audit(user.id, "campaign.create", "Campaign", campaign.id);
  revalidatePath("/command-center/campaigns");
}

export async function createOpportunity(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ title: text, summary: z.string().trim().min(1).max(5000), whyItMatters: optionalText, sourceLabel: optionalText, actionRecommendation: optionalText }).parse({
    title: formData.get("title"), summary: formData.get("summary"), whyItMatters: formData.get("whyItMatters"), sourceLabel: formData.get("sourceLabel"), actionRecommendation: formData.get("actionRecommendation"),
  });
  const urgency = z.coerce.number().int().min(0).max(100).parse(formData.get("urgency") ?? 50);
  const opportunity = await prisma.opportunity.create({ data: {
    ...input, urgency, recommendedAt: optionalDate(formData.get("recommendedAt")),
    markets: { connect: ids(formData, "marketIds").map((id) => ({ id })) },
    teams: { connect: ids(formData, "teamIds").map((id) => ({ id })) },
    campaigns: { create: ids(formData, "campaignIds").map((campaignId) => ({ campaignId })) },
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

export async function updateOpportunityStatus(opportunityId: string, formData: FormData) {
  const user = await requireEditor();
  const status = z.enum(["NEW", "REVIEWED", "DEVELOPING", "QUEUED", "COMPLETE", "NO_POST", "DISMISSED"]).parse(formData.get("status"));
  await prisma.opportunity.update({ where: { id: opportunityId }, data: { status, noPostRationale: status === "NO_POST" ? String(formData.get("noPostRationale") || "Not worth publishing now") : undefined } });
  await audit(user.id, "opportunity.status", "Opportunity", opportunityId);
  revalidatePath("/command-center/opportunities");
  revalidatePath("/command-center");
}

export async function createContentFromOpportunity(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ opportunityId: text, brandId: text, objective: text, hook: text, rationale: text, body: z.string().trim().min(1).max(20000), callToAction: optionalText, visualBrief: optionalText, socialAccountId: optionalText }).parse({
    opportunityId: formData.get("opportunityId"), brandId: formData.get("brandId"), objective: formData.get("objective"), hook: formData.get("hook"), rationale: formData.get("rationale"), body: formData.get("body"), callToAction: formData.get("callToAction"), visualBrief: formData.get("visualBrief"), socialAccountId: formData.get("socialAccountId"),
  });
  const angle = await prisma.brandAngle.upsert({
    where: { opportunityId_brandId: { opportunityId: input.opportunityId, brandId: input.brandId } },
    update: { objective: input.objective, hook: input.hook, rationale: input.rationale, suggestedVisual: input.visualBrief },
    create: { opportunityId: input.opportunityId, brandId: input.brandId, objective: input.objective, hook: input.hook, rationale: input.rationale, suggestedVisual: input.visualBrief },
  });
  const draft = await prisma.contentDraft.create({ data: { brandAngleId: angle.id, socialAccountId: input.socialAccountId, body: input.body, callToAction: input.callToAction, visualBrief: input.visualBrief } });
  await prisma.opportunity.update({ where: { id: input.opportunityId }, data: { status: "DEVELOPING" } });
  await audit(user.id, "content.create", "ContentDraft", draft.id);
  redirect(`/command-center/queue?created=${draft.id}`);
}

export async function updateDraftStatus(draftId: string, formData: FormData) {
  const user = await requireEditor();
  const status = z.enum(["DRAFT", "NEEDS_REVIEW", "REVISION_REQUESTED", "APPROVED", "REJECTED", "ARCHIVED"]).parse(formData.get("status"));
  await prisma.$transaction(async (tx) => {
    await tx.contentDraft.update({ where: { id: draftId }, data: { status } });
    if (["APPROVED", "REVISION_REQUESTED", "REJECTED"].includes(status)) await tx.approval.create({ data: { draftId, reviewerId: user.id, decision: status as "APPROVED" | "REVISION_REQUESTED" | "REJECTED", comment: String(formData.get("comment") || "") || null } });
  });
  await audit(user.id, `content.${status.toLowerCase()}`, "ContentDraft", draftId);
  revalidatePath("/command-center/queue");
  revalidatePath("/command-center");
}

export async function scheduleDraft(draftId: string, formData: FormData) {
  const user = await requireEditor();
  const socialAccountId = text.parse(formData.get("socialAccountId"));
  const scheduledFor = optionalDate(formData.get("scheduledFor"));
  if (!scheduledFor) throw new Error("A publish time is required");
  await prisma.$transaction([
    prisma.contentDraft.update({ where: { id: draftId }, data: { status: "READY", socialAccountId, scheduledFor } }),
    prisma.publication.upsert({ where: { draftId }, update: { socialAccountId, scheduledFor, status: "PLANNED" }, create: { draftId, socialAccountId, scheduledFor } }),
  ]);
  await audit(user.id, "content.schedule", "ContentDraft", draftId);
  revalidatePath("/command-center/queue");
  revalidatePath("/command-center");
}

export async function addRelationshipActivity(relationshipId: string, formData: FormData) {
  const user = await requireEditor();
  const type = z.enum(["EMAIL", "DM", "CALL", "MEETING", "NOTE", "FOLLOW_UP", "OTHER"]).parse(formData.get("type"));
  const summary = z.string().trim().min(1).max(5000).parse(formData.get("summary"));
  const nextStep = String(formData.get("nextStep") || "").trim() || null;
  const occurredAt = optionalDate(formData.get("occurredAt")) ?? new Date();
  await prisma.$transaction([
    prisma.relationshipActivity.create({ data: { relationshipId, type, summary, nextStep, occurredAt } }),
    prisma.relationship.update({ where: { id: relationshipId }, data: { lastOutreachAt: type === "NOTE" ? undefined : occurredAt, nextFollowUpAt: optionalDate(formData.get("nextFollowUpAt")) } }),
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

export async function upsertSocialAccount(brandId: string, formData: FormData) {
  const user = await requireEditor();
  const platform = z.enum(["X", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TIKTOK", "YOUTUBE", "THREADS", "OTHER"]).parse(formData.get("platform"));
  const handle = String(formData.get("handle") || "").trim() || null;
  const profileUrl = String(formData.get("profileUrl") || "").trim() || null;
  await prisma.socialAccount.upsert({ where: { brandId_platform: { brandId, platform } }, update: { handle, profileUrl }, create: { brandId, platform, handle, profileUrl, publishingMode: "MANUAL", autopilotAllowed: false } });
  await audit(user.id, "social_account.upsert", "Brand", brandId);
  revalidatePath(`/command-center/brands/${brandId}`);
}
