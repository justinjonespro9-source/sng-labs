"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { completedAtFor, validateGrowthAction, type GrowthActionStatus } from "./actions-rules";
import { growthStages, type BriefContent } from "./briefs";
import { runFormAction } from "./form-action";
import { safeReturnTo } from "./form-state";
import { assertCanAllocatePortfolio, assertCanEditGrowth } from "./permissions";
import { parseWeeklyHours, portfolioAllocations } from "./priorities";
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
  const returnTo = safeReturnTo(formData, "/command-center/growth");
  await runFormAction(returnTo, async () => {
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

// Growth actions ---------------------------------------------------------

export async function createGrowthActionAction(formData: FormData) {
  const returnTo = safeReturnTo(formData, "/command-center/growth");
  await runFormAction(returnTo, async () => {
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
  const returnTo = safeReturnTo(formData, "/command-center/growth");
  await runFormAction(returnTo, async () => {
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
