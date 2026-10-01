import "server-only";

import type { Prisma } from "@prisma/client";
import { contentModesFromValue, hasConfiguredBrandBrain } from "@/lib/command-center/brand-brain";
import { prisma } from "@/lib/prisma";
import { contextCompatibility } from "@/lib/ai-lab/compatibility";
import { AI_LAB_GENERATION_VERSION, type GenerationInput } from "@/lib/ai-lab/schema";
import { buildStrategySnapshot } from "@/lib/ai-lab/strategy";

const decimal = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));
const metricSelect = { id: true, key: true, version: true, label: true, unit: true } as const;

async function loadStrategy(brandId: string, campaign: { id: string; offer: string | null; hypothesis: string | null } | null, now: Date) {
  const [brief, priority, targets, measurements, reviews] = await Promise.all([
    prisma.brandGrowthBrief.findFirst({ where: { brandId, status: "CURRENT" } }),
    prisma.brandPortfolioPriority.findFirst({ where: { brandId, status: "CURRENT" } }),
    campaign ? prisma.campaignTarget.findMany({ where: { campaignId: campaign.id, brandId }, include: { metricDefinition: { select: metricSelect } }, orderBy: { periodEnd: "asc" } }) : [],
    prisma.growthMeasurement.findMany({ where: { brandId, status: "REVIEWED", supersededBy: { is: null }, campaignId: campaign ? campaign.id : null, asOfAt: { lte: now } }, include: { definition: { select: metricSelect } }, orderBy: [{ asOfAt: "desc" }, { id: "desc" }], take: 8 }),
    campaign ? prisma.campaignReview.findMany({ where: { campaignId: campaign.id }, orderBy: { reviewedAt: "desc" }, take: 3 }) : [],
  ]);
  return buildStrategySnapshot({
    now, brief, priority, campaign,
    targets: targets.map((target) => ({ ...target, targetValue: Number(target.targetValue), baselineValue: decimal(target.baselineValue), definition: target.metricDefinition })),
    measurements: measurements.map((row) => ({ ...row, value: decimal(row.value), numerator: decimal(row.numerator), denominator: decimal(row.denominator) })),
    reviews,
  });
}

export type ResolvedGenerationContext = Awaited<ReturnType<typeof resolveGenerationContext>>;

const campaignInclude = {
  brands: { select: { id: true, name: true } },
  markets: { select: { id: true, name: true } },
  teams: { select: { id: true, name: true } },
  program: { select: { id: true, name: true, description: true, operatingDescription: true, status: true, brands: { select: { id: true, name: true } } } },
} as const;

const activationInclude = {
  campaign: { include: campaignInclude },
  market: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  event: { select: { id: true, name: true, startsAt: true, endsAt: true } },
  brands: { select: { id: true, name: true } },
} as const;

const eventInclude = {
  market: { select: { id: true, name: true } },
  venue: { select: { id: true, key: true, name: true, city: true, state: true, country: true, stadiumSlopVenueKey: true } },
  homeTeam: { select: { id: true, name: true, abbreviation: true } },
  awayTeam: { select: { id: true, name: true, abbreviation: true } },
} as const;

export async function resolveGenerationContext(input: GenerationInput) {
  const [brand, selectedProgram, selectedCampaign, selectedActivation, selectedEvent, selectedOpportunity, relationship] = await Promise.all([
    prisma.brand.findFirst({ where: { id: input.brandId, active: true } }),
    input.growthProgramId ? prisma.growthProgram.findUnique({ where: { id: input.growthProgramId }, include: { brands: { select: { id: true, name: true } } } }) : null,
    input.campaignId ? prisma.campaign.findUnique({ where: { id: input.campaignId }, include: campaignInclude }) : null,
    input.activationId ? prisma.campaignActivation.findUnique({ where: { id: input.activationId }, include: activationInclude }) : null,
    input.eventId ? prisma.growthEvent.findUnique({ where: { id: input.eventId }, include: eventInclude }) : null,
    input.opportunityId ? prisma.opportunity.findUnique({ where: { id: input.opportunityId }, include: { event: { include: eventInclude }, activation: { include: activationInclude }, campaigns: { include: { campaign: { include: campaignInclude } } }, markets: { select: { id: true, name: true } }, teams: { select: { id: true, name: true } }, angles: { include: { brand: { select: { id: true, name: true } } } } } }) : null,
    input.relationshipId ? prisma.relationship.findUnique({ where: { id: input.relationshipId }, include: { organization: { include: { market: { select: { id: true, name: true } }, teams: { select: { id: true, name: true } }, relevantBrands: { select: { id: true, name: true } } } }, contact: { select: { id: true, name: true, title: true } }, campaign: { select: { id: true, name: true } }, campaignLinks: { select: { campaign: { select: { id: true, name: true } } } }, relevantBrands: { select: { id: true, name: true } }, activations: { select: { id: true, name: true, campaignId: true } } } }) : null,
  ]);

  if (!brand) throw new Error("Choose an active canonical Brand");
  if (!hasConfiguredBrandBrain(brand)) throw new Error("The selected Brand Brain is not configured");
  if (input.growthProgramId && !selectedProgram) throw new Error("Growth Program not found");
  if (input.campaignId && !selectedCampaign) throw new Error("Campaign not found");
  if (input.activationId && !selectedActivation) throw new Error("Activation not found");
  if (input.eventId && !selectedEvent) throw new Error("Event not found");
  if (input.opportunityId && !selectedOpportunity) throw new Error("Opportunity not found");
  if (input.relationshipId && !relationship) throw new Error("Relationship not found");

  const activation = selectedActivation ?? selectedOpportunity?.activation ?? null;
  const opportunityCampaigns = selectedOpportunity?.campaigns.map((item) => item.campaign) ?? [];
  const campaign = selectedCampaign ?? activation?.campaign ?? opportunityCampaigns.find((item) => item.brands.some((entry) => entry.id === brand.id)) ?? opportunityCampaigns[0] ?? null;
  const event = selectedEvent ?? selectedOpportunity?.event ?? null;
  const relationshipCampaignIds = relationship ? [...new Set([relationship.campaignId, ...relationship.campaignLinks.map((link) => link.campaign.id)].filter((id): id is string => Boolean(id)))] : [];

  const compatibility = contextCompatibility({
    brandId: brand.id,
    selectedProgramId: selectedProgram?.id,
    selectedCampaign,
    selectedActivation: selectedActivation ? { id: selectedActivation.id, campaignId: selectedActivation.campaignId, brandIds: selectedActivation.brands.map((item) => item.id) } : null,
    selectedEventId: selectedEvent?.id,
    selectedOpportunity: selectedOpportunity ? { eventId: selectedOpportunity.eventId, activationId: selectedOpportunity.activationId, campaignIds: [...new Set([selectedOpportunity.activation?.campaignId, ...selectedOpportunity.campaigns.map((item) => item.campaignId)].filter((id): id is string => Boolean(id)))] } : null,
    relationship: relationship ? { campaignIds: relationshipCampaignIds, brandIds: relationship.relevantBrands.map((item) => item.id) } : null,
    resolvedCampaign: campaign ? { id: campaign.id, programId: campaign.programId, brandIds: campaign.brands.map((item) => item.id) } : null,
  });
  if (compatibility.errors.length) throw new Error(compatibility.errors.join("; "));
  const now = new Date();
  const strategy = await loadStrategy(brand.id, campaign ? { id: campaign.id, offer: campaign.offer, hypothesis: campaign.hypothesis } : null, now);

  return {
    generationVersion: AI_LAB_GENERATION_VERSION,
    resolvedAt: now.toISOString(),
    channel: input.channel,
    trust: {
      structuredContext: "TRUSTED_STRUCTURED_CONTEXT" as const,
      operatorContext: input.operatorContext ? input.operatorContextTrust : undefined,
      absentContext: "Anything not listed below is absent and must not be invented" as const,
    },
    brand: { id: brand.id, key: brand.key, name: brand.name, kind: brand.kind },
    brandBrain: {
      version: brand.brandBrainVersion,
      configuredAt: brand.brandBrainConfiguredAt?.toISOString(),
      identity: brand.description,
      purpose: brand.purpose,
      corePromise: brand.corePromise,
      positioning: brand.coreProposition,
      audience: brand.audience,
      secondaryAudiences: brand.secondaryAudiences,
      distributionAudiences: brand.distributionAudiences,
      jobsToBeDone: brand.jobsToBeDone,
      voice: brand.voice,
      voiceTraits: brand.voiceTraits,
      communicationPatterns: brand.communicationPatterns,
      messagingPillars: brand.contentPillars,
      contentModes: contentModesFromValue(brand.contentModes),
      primaryCtas: brand.primaryCtas,
      terminology: brand.terminology,
      prohibitedContent: brand.prohibitedContent,
      factualRequirements: brand.factualRequirements,
      affiliationRestrictions: brand.affiliationRestrictions,
      aiOperatingInstructions: brand.aiOperatingInstructions,
      callToActionRules: brand.callToActionRules,
      visualDirection: brand.visualDirection,
      cadence: brand.defaultCadenceNotes,
    },
    growthProgram: selectedProgram ? { id: selectedProgram.id, name: selectedProgram.name, description: selectedProgram.description, operatingDescription: selectedProgram.operatingDescription, status: selectedProgram.status, brands: selectedProgram.brands } : campaign?.program ? campaign.program : null,
    campaign: campaign ? { id: campaign.id, name: campaign.name, description: campaign.description, objective: campaign.objective, objectiveType: campaign.objectiveType, primaryAudience: campaign.primaryAudience, primaryCta: campaign.primaryCta, coreMessage: campaign.coreMessage, offer: campaign.offer, hypothesis: campaign.hypothesis, destinationUrl: campaign.destinationUrl, executionPlan: campaign.executionPlan, sport: campaign.sport, season: campaign.season, status: campaign.status, startsAt: campaign.startsAt?.toISOString(), endsAt: campaign.endsAt?.toISOString(), brands: campaign.brands, markets: campaign.markets, teams: campaign.teams } : null,
    activation: activation ? { id: activation.id, name: activation.name, campaignId: activation.campaignId, status: activation.status, priority: activation.priority, market: activation.market, team: activation.team, event: activation.event ? { ...activation.event, startsAt: activation.event.startsAt.toISOString(), endsAt: activation.event.endsAt?.toISOString() } : null, venueName: activation.venueName, sport: activation.sport, season: activation.season, week: activation.week, slateLabel: activation.slateLabel, audienceSegment: activation.audienceSegment, coreMessage: activation.coreMessage, callToAction: activation.callToAction, objective: activation.objective, startsAt: activation.startsAt?.toISOString(), endsAt: activation.endsAt?.toISOString(), brands: activation.brands } : null,
    event: event ? { id: event.id, key: event.key, name: event.name, type: event.type, sport: event.sport, league: event.league, season: event.season, week: event.week, status: event.status, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString(), neutralSite: event.neutralSite, publicUrl: event.publicUrl, source: event.source, sourceEventId: event.sourceEventId, market: event.market, venue: event.venue, homeTeam: event.homeTeam, awayTeam: event.awayTeam } : null,
    opportunity: selectedOpportunity ? { id: selectedOpportunity.id, title: selectedOpportunity.title, summary: selectedOpportunity.summary, whyItMatters: selectedOpportunity.whyItMatters, status: selectedOpportunity.status, urgency: selectedOpportunity.urgency, recommendedAt: selectedOpportunity.recommendedAt?.toISOString(), expiresAt: selectedOpportunity.expiresAt?.toISOString(), actionRecommendation: selectedOpportunity.actionRecommendation, sourceLabel: selectedOpportunity.sourceLabel, campaigns: selectedOpportunity.campaigns.map((item) => item.campaign), markets: selectedOpportunity.markets, teams: selectedOpportunity.teams, relevantBrands: selectedOpportunity.angles.map((angle) => angle.brand) } : null,
    audience: input.audienceSegment || activation?.audienceSegment || campaign?.primaryAudience || null,
    relationship: relationship ? { id: relationship.id, name: relationship.name, stage: relationship.stage, summary: relationship.summary, organization: { id: relationship.organization.id, name: relationship.organization.name, type: relationship.organization.type, market: relationship.organization.market, teams: relationship.organization.teams, relevantBrands: relationship.organization.relevantBrands }, contact: relationship.contact, campaign: relationship.campaign, campaignIds: relationshipCampaignIds, nextAction: relationship.nextAction, relevantBrands: relationship.relevantBrands, activations: relationship.activations } : null,
    operatorContext: input.operatorContext ? { text: input.operatorContext, trust: input.operatorContextTrust } : null,
    strategy,
    compatibilityWarnings: compatibility.warnings,
  };
}
