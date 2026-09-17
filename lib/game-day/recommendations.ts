import type { Prisma, PrismaClient } from "@prisma/client";
import { evaluateEventRelevance, evaluateSlateRelevance, GAME_DAY_RULE_VERSION, type RecommendationCandidate, type RelevanceEvent } from "./relevance";

const eventInclude = {
  market: { select: { id: true, name: true } },
  venue: { select: { id: true, key: true, name: true, stadiumSlopVenueKey: true } },
  homeTeam: { select: { id: true, name: true, brands: { select: { key: true } } } },
  awayTeam: { select: { id: true, name: true } },
} as const;

const activationInclude = {
  brands: { select: { key: true } },
  campaign: { select: { id: true, name: true, status: true, brands: { select: { key: true } } } },
} as const;

function matchesActivation(event: { id: string; homeTeamId: string | null; marketId: string | null; venueId: string | null; venueName: string | null }, activation: { eventId: string | null; teamId: string | null; marketId: string | null; venueId: string | null; venueName: string | null }) {
  if (activation.eventId) return activation.eventId === event.id;
  if (activation.teamId) return activation.teamId === event.homeTeamId;
  if (activation.venueId) return activation.venueId === event.venueId;
  if (activation.venueName) return activation.venueName === event.venueName;
  return Boolean(activation.marketId && activation.marketId === event.marketId);
}

export async function evaluateAndPersistNflWeek(prisma: PrismaClient, input: { season: number; week: number }) {
  const [events, activations, brands] = await Promise.all([
    prisma.growthEvent.findMany({ where: { league: "NFL", season: input.season, week: input.week }, include: eventInclude, orderBy: { startsAt: "asc" } }),
    prisma.campaignActivation.findMany({ where: { status: { in: ["READY", "ACTIVE"] }, OR: [{ sport: "NFL" }, { sport: null }] }, include: activationInclude }),
    prisma.brand.findMany({ where: { active: true }, select: { id: true, key: true } }),
  ]);
  if (!events.length) throw new Error(`No NFL events found for ${input.season} Week ${input.week}`);

  const candidates: RecommendationCandidate[] = [];
  for (const event of events) {
    const relevantActivations = activations.filter((activation) => matchesActivation(event, activation));
    candidates.push(...evaluateEventRelevance({ ...event, activations: relevantActivations } satisfies RelevanceEvent));
  }
  candidates.push(...evaluateSlateRelevance({ league: "NFL", season: input.season, week: input.week, eventCount: events.length, startsAt: events[0].startsAt }));

  const brandIds = new Map(brands.map((brand) => [brand.key, brand.id]));
  const unresolvedBrands = [...new Set(candidates.map((candidate) => candidate.brandKey).filter((key) => !brandIds.has(key)))];
  if (unresolvedBrands.length) throw new Error(`Missing active canonical Brands: ${unresolvedBrands.join(", ")}`);

  let created = 0;
  let refreshed = 0;
  for (const candidate of candidates) {
    const brandId = brandIds.get(candidate.brandKey)!;
    const existing = await prisma.opportunityRecommendation.findUnique({ where: { brandId_scopeKey_ruleVersion: { brandId, scopeKey: candidate.scopeKey, ruleVersion: GAME_DAY_RULE_VERSION } } });
    await prisma.opportunityRecommendation.upsert({
      where: { brandId_scopeKey_ruleVersion: { brandId, scopeKey: candidate.scopeKey, ruleVersion: GAME_DAY_RULE_VERSION } },
      create: { brandId, eventId: candidate.eventId, campaignId: candidate.campaignId, activationId: candidate.activationId, scope: candidate.scope, scopeKey: candidate.scopeKey, outcome: candidate.outcome, reason: candidate.reason, priority: candidate.priority, contextSnapshot: candidate.contextSnapshot as Prisma.InputJsonValue, ruleVersion: GAME_DAY_RULE_VERSION },
      update: { eventId: candidate.eventId, campaignId: candidate.campaignId, activationId: candidate.activationId, scope: candidate.scope, outcome: candidate.outcome, reason: candidate.reason, priority: candidate.priority, contextSnapshot: candidate.contextSnapshot as Prisma.InputJsonValue, evaluatedAt: new Date() },
    });
    if (existing) refreshed++;
    else created++;
  }

  return { events: events.length, candidates: candidates.length, created, refreshed, ruleVersion: GAME_DAY_RULE_VERSION };
}
