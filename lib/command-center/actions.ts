"use server";

import { revalidatePath } from "next/cache";
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
  const input = z.object({ title: text, summary: z.string().trim().min(1).max(5000), sourceLabel: optionalText, actionRecommendation: optionalText }).parse({
    title: formData.get("title"), summary: formData.get("summary"), sourceLabel: formData.get("sourceLabel"), actionRecommendation: formData.get("actionRecommendation"),
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
  const input = z.object({ description: z.string().trim().min(1).max(5000), audience: z.string().trim().min(1).max(5000), voice: z.string().trim().min(1).max(5000), callToActionRules: z.string().trim().min(1).max(5000), defaultCadenceNotes: z.string().trim().min(1).max(5000) }).parse({
    description: formData.get("description"), audience: formData.get("audience"), voice: formData.get("voice"), callToActionRules: formData.get("callToActionRules"), defaultCadenceNotes: formData.get("defaultCadenceNotes"),
  });
  await prisma.brand.update({ where: { id: brandId }, data: { ...input, primaryCtas: split("primaryCtas"), relevantUrls: split("relevantUrls"), preferredContent: split("preferredContent"), prohibitedContent: split("prohibitedContent") } });
  await audit(user.id, "brand.update", "Brand", brandId);
  revalidatePath("/command-center/brands");
}
