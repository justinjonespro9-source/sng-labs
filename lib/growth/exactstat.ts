import { Prisma, type PrismaClient } from "@prisma/client";
import { exactStatBrandBrain, shouldInitializeBrandBrain } from "../command-center/brand-brain";
import { brandDefinitions } from "../command-center/brand-definitions";

export const EXACTSTAT_KEY = "exactstat";

/** The only strategy ExactStat receives automatically: a partial DEVELOPMENT draft that a human must complete and approve. */
export const exactStatDevelopmentBriefDraft = {
  stage: "DEVELOPMENT" as const,
  priorityAudience: "Hypothesis: fans who already make numeric predictions (fantasy, pick'em, stat-focused fans). To be confirmed through prototype comprehension tests.",
  offer: null,
  activationDefinition: "Hypothesis: a prototype participant submits a first exact-number pick and can explain how it is judged.",
  repeatDefinition: null,
  bottleneck: "Concept comprehension is unverified: we do not yet know whether fans understand and enjoy predicting an exact number.",
  primaryMotion: "Small, invited prototype comprehension sessions. No public destination, launch or paid acquisition.",
  capacityNotes: null,
  geographyNotes: null,
  marketId: null,
  effectiveAt: null,
  reviewAt: null,
  notes: "Drafted by Growth OS V1 onboarding for operator review. Not approved. No live-money, pool, payout, partner or launch claims. No public destination has been verified.",
};

export type ExactStatPlanStep = "create_brand" | "initialize_brand_brain" | "create_development_brief_draft";
export type ExactStatPlan = { brandExists: boolean; steps: ExactStatPlanStep[]; brandId: string | null; briefCount: number };

export async function planExactStatInitialization(db: PrismaClient): Promise<ExactStatPlan> {
  const brand = await db.brand.findUnique({ where: { key: EXACTSTAT_KEY }, select: { id: true, brandBrainVersion: true, _count: { select: { growthBriefs: true } } } });
  const steps: ExactStatPlanStep[] = [];
  if (!brand) steps.push("create_brand", "initialize_brand_brain", "create_development_brief_draft");
  else {
    if (shouldInitializeBrandBrain(brand.brandBrainVersion)) steps.push("initialize_brand_brain");
    if (brand._count.growthBriefs === 0) steps.push("create_development_brief_draft");
  }
  return { brandExists: Boolean(brand), steps, brandId: brand?.id ?? null, briefCount: brand?._count.growthBriefs ?? 0 };
}

/**
 * Idempotent and narrow: creates the ExactStat brand, its Brand Brain v1 and a DEVELOPMENT draft brief only when absent.
 * Never touches other brands, portfolio priorities, social accounts, campaigns or publishing.
 */
export async function initializeExactStat(db: PrismaClient, options: { actorId?: string | null } = {}) {
  const definition = brandDefinitions.find((brand) => brand.key === EXACTSTAT_KEY);
  if (!definition) throw new Error("ExactStat brand definition is missing");
  return db.$transaction(async (tx) => {
    const performed: ExactStatPlanStep[] = [];
    let brand = await tx.brand.findUnique({ where: { key: EXACTSTAT_KEY }, select: { id: true, brandBrainVersion: true } });
    if (!brand) {
      brand = await tx.brand.create({ data: {
        key: definition.key, name: definition.name, shortName: definition.shortName, kind: definition.kind, description: definition.description,
        audience: definition.audience, voice: definition.voice, objectives: definition.objectives, preferredContent: definition.preferredContent,
        prohibitedContent: definition.prohibitedContent, callToActionRules: definition.callToActionRules, visualDirection: definition.visualDirection,
        defaultCadenceNotes: definition.defaultCadenceNotes, purpose: definition.objectives[0], coreProposition: definition.description, contentPillars: definition.preferredContent, relevantUrls: [],
      }, select: { id: true, brandBrainVersion: true } });
      performed.push("create_brand");
    }
    if (shouldInitializeBrandBrain(brand.brandBrainVersion)) {
      await tx.brand.update({ where: { id: brand.id }, data: {
        ...exactStatBrandBrain,
        contentModes: exactStatBrandBrain.contentModes as Prisma.InputJsonValue,
        primaryCtas: [],
        callToActionRules: definition.callToActionRules,
        brandBrainVersion: 1,
        brandBrainConfiguredAt: new Date(),
      } });
      performed.push("initialize_brand_brain");
    }
    const briefCount = await tx.brandGrowthBrief.count({ where: { brandId: brand.id } });
    if (briefCount === 0) {
      const brief = await tx.brandGrowthBrief.create({ data: {
        brandId: brand.id, revision: 1, status: "DRAFT", createdById: options.actorId ?? null, ...exactStatDevelopmentBriefDraft,
        evidence: { source: "growth-os-v1-exactstat-onboarding", basis: "Approved Growth OS V1 audit §8: DEVELOPMENT draft focused on concept comprehension and prototype tests" },
      } });
      await tx.auditEvent.create({ data: { actorId: options.actorId ?? null, action: "growth_brief.create", entityType: "BrandGrowthBrief", entityId: brief.id, metadata: { brandId: brand.id, revision: 1, stage: "DEVELOPMENT", source: "exactstat-onboarding" } } });
      performed.push("create_development_brief_draft");
    }
    if (performed.length) await tx.auditEvent.create({ data: { actorId: options.actorId ?? null, action: "brand.exactstat.initialize", entityType: "Brand", entityId: brand.id, metadata: { steps: performed.join(",") } } });
    return { brandId: brand.id, performed };
  }, { isolationLevel: "Serializable" });
}
