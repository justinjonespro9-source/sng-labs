import { Prisma, type PrismaClient } from "@prisma/client";
import { shouldInitializeBrandBrain, voteYourCastBrandBrain } from "../command-center/brand-brain";
import { brandDefinitions } from "../command-center/brand-definitions";

export const VOTEYOURCAST_KEY = "vote-your-cast";

/** The only strategy VoteYourCast receives automatically: a partial DEVELOPMENT draft that a human must complete and approve. */
export const voteYourCastDevelopmentBriefDraft = {
  stage: "DEVELOPMENT" as const,
  priorityAudience: "Hypothesis: entertainment and politics-curious audiences who enjoy casting debates, plus media and creators who can amplify a pre-launch property. To be confirmed through outreach.",
  offer: null,
  activationDefinition: "Hypothesis: a media or creator contact agrees to a conversation about the fan-casting format before public voting is live.",
  repeatDefinition: null,
  bottleneck: "Public voting is not live. Marketing preparation and relationship building must not invent a live voting product.",
  primaryMotion: "Pre-launch brand, rights, and media/creator relationship preparation. No public voting destination until separately verified.",
  capacityNotes: null,
  geographyNotes: null,
  marketId: null,
  effectiveAt: null,
  reviewAt: null,
  notes: "Drafted by Growth OS Phase 1 VoteYourCast onboarding for operator review. Not approved. Pre-launch only: no public voting claims, fabricated vote totals, likeness endorsements, or invented advertisers.",
};

export type VoteYourCastPlanStep = "create_brand" | "initialize_brand_brain" | "create_development_brief_draft";
export type VoteYourCastPlan = { brandExists: boolean; steps: VoteYourCastPlanStep[]; brandId: string | null; briefCount: number };

export async function planVoteYourCastInitialization(db: PrismaClient): Promise<VoteYourCastPlan> {
  const brand = await db.brand.findUnique({ where: { key: VOTEYOURCAST_KEY }, select: { id: true, brandBrainVersion: true, _count: { select: { growthBriefs: true } } } });
  const steps: VoteYourCastPlanStep[] = [];
  if (!brand) steps.push("create_brand", "initialize_brand_brain", "create_development_brief_draft");
  else {
    if (shouldInitializeBrandBrain(brand.brandBrainVersion)) steps.push("initialize_brand_brain");
    if (brand._count.growthBriefs === 0) steps.push("create_development_brief_draft");
  }
  return { brandExists: Boolean(brand), steps, brandId: brand?.id ?? null, briefCount: brand?._count.growthBriefs ?? 0 };
}

/**
 * Idempotent and narrow: creates the VoteYourCast brand, its Brand Brain v1 and a DEVELOPMENT draft brief only when absent.
 * Never touches other brands, portfolio priorities, social accounts, campaigns or publishing.
 */
export async function initializeVoteYourCast(db: PrismaClient, options: { actorId?: string | null } = {}) {
  const definition = brandDefinitions.find((brand) => brand.key === VOTEYOURCAST_KEY);
  if (!definition) throw new Error("VoteYourCast brand definition is missing");
  return db.$transaction(async (tx) => {
    const performed: VoteYourCastPlanStep[] = [];
    let brand = await tx.brand.findUnique({ where: { key: VOTEYOURCAST_KEY }, select: { id: true, brandBrainVersion: true } });
    if (!brand) {
      brand = await tx.brand.create({ data: {
        key: definition.key, name: definition.name, shortName: definition.shortName, kind: definition.kind, description: definition.description,
        audience: definition.audience, voice: definition.voice, objectives: definition.objectives, preferredContent: definition.preferredContent,
        prohibitedContent: definition.prohibitedContent, callToActionRules: definition.callToActionRules, visualDirection: definition.visualDirection,
        defaultCadenceNotes: definition.defaultCadenceNotes, purpose: definition.objectives[0], coreProposition: definition.description, contentPillars: definition.preferredContent, relevantUrls: ["https://voteyourcast.com"],
      }, select: { id: true, brandBrainVersion: true } });
      performed.push("create_brand");
    }
    if (shouldInitializeBrandBrain(brand.brandBrainVersion)) {
      await tx.brand.update({ where: { id: brand.id }, data: {
        ...voteYourCastBrandBrain,
        contentModes: voteYourCastBrandBrain.contentModes as Prisma.InputJsonValue,
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
        brandId: brand.id, revision: 1, status: "DRAFT", createdById: options.actorId ?? null, ...voteYourCastDevelopmentBriefDraft,
        evidence: { source: "growth-os-phase1-voteyourcast-onboarding", basis: "Phase 1 plan: PRE-LAUNCH brand shell for marketing preparation; public voting not required" },
      } });
      await tx.auditEvent.create({ data: { actorId: options.actorId ?? null, action: "growth_brief.create", entityType: "BrandGrowthBrief", entityId: brief.id, metadata: { brandId: brand.id, revision: 1, stage: "DEVELOPMENT", source: "voteyourcast-onboarding" } } });
      performed.push("create_development_brief_draft");
    }
    if (performed.length) await tx.auditEvent.create({ data: { actorId: options.actorId ?? null, action: "brand.voteyourcast.initialize", entityType: "Brand", entityId: brand.id, metadata: { steps: performed.join(",") } } });
    return { brandId: brand.id, performed };
  }, { isolationLevel: "Serializable" });
}
