import type { Prisma, PrismaClient } from "@prisma/client";
import { assertBriefApprovable, nextRevision, type BriefContent } from "./briefs";
import type { PortfolioAllocation } from "./priorities";
import { withSerializableRetry } from "./tx";

export async function createGrowthBriefDraft(db: PrismaClient, input: { brandId: string; actorId: string | null; content: BriefContent; evidence?: Prisma.InputJsonValue | null }) {
  return withSerializableRetry(db, async (tx) => {
    const existing = await tx.brandGrowthBrief.findMany({ where: { brandId: input.brandId }, select: { revision: true } });
    const brief = await tx.brandGrowthBrief.create({ data: {
      brandId: input.brandId, revision: nextRevision(existing.map((row) => row.revision)), status: "DRAFT", createdById: input.actorId,
      ...input.content, evidence: input.evidence ?? undefined,
    } });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "growth_brief.create", entityType: "BrandGrowthBrief", entityId: brief.id, metadata: { brandId: input.brandId, revision: brief.revision, stage: brief.stage } } });
    return brief;
  });
}

export async function updateGrowthBriefDraft(db: PrismaClient, input: { briefId: string; actorId: string | null; content: BriefContent }) {
  return withSerializableRetry(db, async (tx) => {
    const current = await tx.brandGrowthBrief.findUnique({ where: { id: input.briefId }, select: { status: true, brandId: true, revision: true } });
    if (!current) throw new Error("Growth Brief not found");
    if (current.status !== "DRAFT") throw new Error("Only DRAFT briefs can be edited. Create a new revision to change a CURRENT brief.");
    const brief = await tx.brandGrowthBrief.update({ where: { id: input.briefId }, data: input.content });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "growth_brief.edit", entityType: "BrandGrowthBrief", entityId: brief.id, metadata: { brandId: current.brandId, revision: current.revision } } });
    return brief;
  });
}

/** Promotes a complete DRAFT to CURRENT and supersedes the previous CURRENT revision atomically. Historical text is never rewritten. */
export async function approveGrowthBrief(db: PrismaClient, input: { briefId: string; actorId: string | null; now?: Date }) {
  const now = input.now ?? new Date();
  return withSerializableRetry(db, async (tx) => {
    const draft = await tx.brandGrowthBrief.findUnique({ where: { id: input.briefId } });
    if (!draft) throw new Error("Growth Brief not found");
    if (draft.status !== "DRAFT") throw new Error(`Only DRAFT briefs can be approved (this revision is ${draft.status})`);
    assertBriefApprovable({ ...draft, stage: draft.stage });
    const previous = await tx.brandGrowthBrief.findFirst({ where: { brandId: draft.brandId, status: "CURRENT" }, select: { id: true, revision: true } });
    if (previous) await tx.brandGrowthBrief.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
    const approved = await tx.brandGrowthBrief.update({ where: { id: draft.id }, data: { status: "CURRENT", approvedById: input.actorId, approvedAt: now, supersedesId: previous?.id ?? null } });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "growth_brief.approve", entityType: "BrandGrowthBrief", entityId: draft.id, metadata: { brandId: draft.brandId, revision: draft.revision, supersededId: previous?.id ?? null, supersededRevision: previous?.revision ?? null } } });
    return approved;
  });
}

export async function archiveGrowthBrief(db: PrismaClient, input: { briefId: string; actorId: string | null }) {
  return withSerializableRetry(db, async (tx) => {
    const brief = await tx.brandGrowthBrief.findUnique({ where: { id: input.briefId }, select: { status: true, brandId: true, revision: true } });
    if (!brief) throw new Error("Growth Brief not found");
    if (brief.status !== "DRAFT") throw new Error("Only DRAFT briefs can be archived; CURRENT briefs are replaced by approving a new revision");
    await tx.brandGrowthBrief.update({ where: { id: input.briefId }, data: { status: "ARCHIVED" } });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "growth_brief.archive", entityType: "BrandGrowthBrief", entityId: input.briefId, metadata: { brandId: brief.brandId, revision: brief.revision } } });
  });
}

export async function setPortfolioPriority(db: PrismaClient, input: { brandId: string; actorId: string | null; allocation: PortfolioAllocation; rationale: string; effectiveAt: Date; reviewAt: Date | null; weeklyHours: number | null; evidence?: Prisma.InputJsonValue | null }) {
  if (!input.rationale.trim()) throw new Error("A rationale is required for every portfolio decision");
  if (input.reviewAt && input.reviewAt <= input.effectiveAt) throw new Error("Review date must be after the effective date");
  return withSerializableRetry(db, async (tx) => {
    const existing = await tx.brandPortfolioPriority.findMany({ where: { brandId: input.brandId }, select: { id: true, revision: true, status: true } });
    const previous = existing.find((row) => row.status === "CURRENT") ?? null;
    if (previous) await tx.brandPortfolioPriority.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
    const priority = await tx.brandPortfolioPriority.create({ data: {
      brandId: input.brandId, revision: nextRevision(existing.map((row) => row.revision)), allocation: input.allocation, status: "CURRENT",
      effectiveAt: input.effectiveAt, reviewAt: input.reviewAt, rationale: input.rationale.trim(), weeklyHours: input.weeklyHours,
      evidence: input.evidence ?? undefined, decidedById: input.actorId, supersedesId: previous?.id ?? null,
    } });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "portfolio_priority.set", entityType: "BrandPortfolioPriority", entityId: priority.id, metadata: { brandId: input.brandId, revision: priority.revision, allocation: input.allocation, supersededId: previous?.id ?? null } } });
    return priority;
  });
}
