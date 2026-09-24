export const GAME_DAY_RULE_VERSION = "game-day-rules-v1";

export type RecommendationCandidate = {
  brandKey: string;
  eventId?: string;
  campaignId?: string;
  activationId?: string;
  scope: "EVENT" | "VENUE" | "MARKET" | "WEEK" | "SLATE" | "CAMPAIGN";
  scopeKey: string;
  outcome: "CREATE_OPPORTUNITY" | "SKIP" | "NEEDS_CONTEXT";
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  contextSnapshot: Record<string, unknown>;
};

export type RelevanceEvent = {
  id: string;
  key: string | null;
  league: string | null;
  season: number | null;
  week: number | null;
  startsAt: Date;
  status: string;
  neutralSite: boolean;
  market: { id: string; name: string; relevancePolicies?: { brand: { key: string } }[] } | null;
  venue: { id: string; key: string; name: string; stadiumSlopVenueKey: string | null; relevancePolicies?: { brand: { key: string } }[] } | null;
  homeTeam: { id: string; name: string; brands: { key: string }[]; relevancePolicies?: { brand: { key: string } }[] } | null;
  awayTeam: { id: string; name: string } | null;
  activations: { id: string; campaignId: string; teamId: string | null; marketId: string | null; venueId: string | null; venueName: string | null; brands: { key: string }[]; campaign: { id: string; name: string; status: string; brands: { key: string }[] } }[];
};

function eventSnapshot(event: RelevanceEvent) {
  return {
    eventId: event.id,
    eventKey: event.key,
    league: event.league,
    season: event.season,
    week: event.week,
    startsAt: event.startsAt.toISOString(),
    status: event.status,
    neutralSite: event.neutralSite,
    market: event.market,
    venue: event.venue && { id: event.venue.id, key: event.venue.key, name: event.venue.name },
    homeTeam: event.homeTeam && { id: event.homeTeam.id, name: event.homeTeam.name },
    awayTeam: event.awayTeam && { id: event.awayTeam.id, name: event.awayTeam.name },
  };
}

function matchingActivation(event: RelevanceEvent, brandKey: string) {
  return event.activations.find((activation) => activation.brands.some((brand) => brand.key === brandKey) || activation.campaign.brands.some((brand) => brand.key === brandKey));
}

export function evaluateEventRelevance(event: RelevanceEvent): RecommendationCandidate[] {
  if (!event.key || event.league !== "NFL" || !event.season || !event.week) return [];
  const snapshot = eventSnapshot(event);
  const results: RecommendationCandidate[] = [];
  const stadiumActivation = matchingActivation(event, "stadium-slop");

  const stadiumSlopVenueRelevant = Boolean(event.venue?.stadiumSlopVenueKey || event.venue?.relevancePolicies?.some((policy) => policy.brand.key === "stadium-slop"));
  if (stadiumSlopVenueRelevant) {
    const hasStrategicContext = Boolean(stadiumActivation);
    results.push({
      brandKey: "stadium-slop",
      eventId: event.id,
      campaignId: stadiumActivation?.campaignId,
      activationId: stadiumActivation?.id,
      scope: "VENUE",
      scopeKey: `${event.key}:stadium-slop`,
      outcome: hasStrategicContext && !event.neutralSite ? "CREATE_OPPORTUNITY" : "NEEDS_CONTEXT",
      reason: event.neutralSite
        ? "Supported venue detected, but this is a neutral-site game and must not inherit the designated home team's normal market activation."
        : hasStrategicContext
          ? `Supported Stadium Slop venue with linked ${stadiumActivation!.campaign.name} activation context.`
          : "Supported Stadium Slop venue and actionable NFL event detected, but no matching Activation is linked.",
      priority: hasStrategicContext && !event.neutralSite ? "HIGH" : "MEDIUM",
      contextSnapshot: { ...snapshot, naturalUnit: "VENUE", campaign: stadiumActivation?.campaign ?? null, activationId: stadiumActivation?.id ?? null },
    });
  }

  const teamM8tesActivation = matchingActivation(event, "team-m8tes");
  const teamM8tesTeamRelevant = Boolean(event.homeTeam?.relevancePolicies?.some((policy) => policy.brand.key === "team-m8tes") || event.homeTeam?.brands.some((brand) => brand.key === "team-m8tes"));
  const teamM8tesMarketRelevant = event.market?.relevancePolicies?.some((policy) => policy.brand.key === "team-m8tes") ?? false;
  if (!event.neutralSite && (teamM8tesActivation || teamM8tesTeamRelevant || teamM8tesMarketRelevant)) {
    results.push({
      brandKey: "team-m8tes",
      eventId: event.id,
      campaignId: teamM8tesActivation?.campaignId,
      activationId: teamM8tesActivation?.id,
      scope: "MARKET",
      scopeKey: `${event.key}:team-m8tes`,
      outcome: teamM8tesActivation ? "CREATE_OPPORTUNITY" : "NEEDS_CONTEXT",
      reason: teamM8tesActivation
        ? `Strategically relevant home market with linked ${teamM8tesActivation.campaign.name} activation context.`
        : "Strategically relevant home team and market detected, but Team-M8tes lacks a matching local Activation.",
      priority: teamM8tesActivation ? "HIGH" : "MEDIUM",
      contextSnapshot: { ...snapshot, naturalUnit: "MARKET", brandIdentity: "Dating-forward, connection-broad", campaign: teamM8tesActivation?.campaign ?? null, activationId: teamM8tesActivation?.id ?? null },
    });
  }

  return results;
}

export function evaluateSlateRelevance(input: { league: string; season: number; week: number; eventCount: number; startsAt: Date }): RecommendationCandidate[] {
  const scopeKey = `${input.league.toLowerCase()}-${input.season}-week-${input.week}`;
  const contextSnapshot = { league: input.league, season: input.season, week: input.week, eventCount: input.eventCount, startsAt: input.startsAt.toISOString(), naturalUnit: "WEEK_SLATE" };
  return [
    { brandKey: "rank-eye-q", scope: "WEEK", scopeKey: `${scopeKey}:rank-eye-q`, outcome: "NEEDS_CONTEXT", reason: "NFL week context is available at the correct slate level; trusted ranking-board timing and field context are still required.", priority: "MEDIUM", contextSnapshot: { ...contextSnapshot, editorialTerritory: "Rank the Field / Prove You Know Ball" } },
    { brandKey: "handicap-hero", scope: "SLATE", scopeKey: `${scopeKey}:handicap-hero`, outcome: "NEEDS_CONTEXT", reason: "NFL slate context is available; trusted contest, card, and available-pick context are required before creating an Opportunity.", priority: "MEDIUM", contextSnapshot: { ...contextSnapshot, editorialTerritory: "Rank Your Conviction / Survive the Card" } },
    { brandKey: "fantasytrack", scope: "SLATE", scopeKey: `${scopeKey}:fantasytrack`, outcome: "NEEDS_CONTEXT", reason: "NFL slate context is available; trusted position-race and eligible-field context are required before creating an Opportunity.", priority: "MEDIUM", contextSnapshot: { ...contextSnapshot, editorialTerritory: "Position Race / Pick Your Runner" } },
    { brandKey: "eyez-on-the-prize", scope: "WEEK", scopeKey: `${scopeKey}:eyez-on-the-prize`, outcome: "SKIP", reason: "A routine NFL week is not an Eyez activation without a real campaign, sponsor, prize, and activation context.", priority: "LOW", contextSnapshot },
    { brandKey: "sng-labs", scope: "WEEK", scopeKey: `${scopeKey}:sng-labs`, outcome: "SKIP", reason: "A routine NFL week is not a company-level SNG LABS story without a real portfolio experiment, launch, partnership, or operating lesson.", priority: "LOW", contextSnapshot },
  ];
}

export function collapseRecommendationCount(eventCandidates: RecommendationCandidate[], slateCandidates: RecommendationCandidate[]) {
  return eventCandidates.length + slateCandidates.length;
}
