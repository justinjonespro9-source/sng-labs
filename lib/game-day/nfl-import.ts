import type { GrowthEventStatus, Prisma, PrismaClient } from "@prisma/client";
import { NFL_FOUNDATION_SOURCE, nflTeams, nflVenues, resolveNflTeam, resolveNflVenue } from "./nfl-foundation";
import type { NflFixture, NflFixtureEvent } from "./nfl-fixture";

export const NFL_IMPORTER_VERSION = "game-day-nfl-v1";

type MappedEvent = {
  sourceEventId: string;
  key: string;
  name: string;
  season: number;
  week: number;
  startsAt: Date;
  status: GrowthEventStatus;
  homeTeamKey: string;
  awayTeamKey: string;
  venueKey: string;
  venueName: string;
  neutralSite: boolean;
  sourceUpdatedAt: Date;
  sourceMetadata: Prisma.InputJsonValue;
};

export type NflImportPlan = {
  mapped: MappedEvent[];
  unresolved: { eventId: string; reason: string }[];
};

export type NflImportSummary = {
  dryRun: boolean;
  fixtureEvents: number;
  mapped: number;
  created: number;
  updated: number;
  unchanged: number;
  missingExistingEvents: number;
  unresolved: { eventId: string; reason: string }[];
  foundation: { marketsCreated: number; venuesCreated: number; teamsCreated: number };
};

export function mapFixtureStatus(event: Pick<NflFixtureEvent, "statusName" | "timeValid">): GrowthEventStatus {
  const status = event.statusName.toUpperCase();
  if (status.includes("FINAL")) return "FINAL";
  if (status.includes("CANCEL")) return "CANCELLED";
  if (status.includes("POSTPON")) return "POSTPONED";
  if (status.includes("IN_PROGRESS") || status.includes("HALFTIME")) return "LIVE";
  return event.timeValid ? "SCHEDULED" : "TIME_TBD";
}

export function buildNflImportPlan(fixture: NflFixture): NflImportPlan {
  const mapped: MappedEvent[] = [];
  const unresolved: NflImportPlan["unresolved"] = [];

  for (const event of fixture.events) {
    const homeTeam = resolveNflTeam(event.homeTeamName);
    const awayTeam = resolveNflTeam(event.awayTeamName);
    const venue = resolveNflVenue(event.venueName);
    const startsAt = new Date(event.startsAt);
    const problems = [
      !homeTeam ? `unmapped home team: ${event.homeTeamName}` : null,
      !awayTeam ? `unmapped away team: ${event.awayTeamName}` : null,
      !venue ? `unmapped venue: ${event.venueName}` : null,
      Number.isNaN(startsAt.getTime()) ? `invalid kickoff: ${event.startsAt}` : null,
    ].filter((problem): problem is string => Boolean(problem));

    if (problems.length || !homeTeam || !awayTeam || !venue) {
      unresolved.push({ eventId: event.eventId, reason: problems.join("; ") });
      continue;
    }

    mapped.push({
      sourceEventId: event.eventId,
      key: `nfl-${fixture.season}-${event.eventId}`,
      name: `${event.awayTeamName} at ${event.homeTeamName}`,
      season: event.season,
      week: event.week,
      startsAt,
      status: mapFixtureStatus(event),
      homeTeamKey: homeTeam.key,
      awayTeamKey: awayTeam.key,
      venueKey: venue.key,
      venueName: venue.name,
      neutralSite: event.isNeutralSite,
      sourceUpdatedAt: new Date(fixture.fetchedAt),
      sourceMetadata: {
        importerVersion: NFL_IMPORTER_VERSION,
        fixtureSource: fixture.source,
        fixtureFetchedAt: fixture.fetchedAt,
        timeValid: event.timeValid,
        sourceStatus: event.statusName,
        sourceStatusDetail: event.statusDetail,
      },
    });
  }

  return { mapped, unresolved };
}

function changed(existing: {
  name: string;
  season: number | null;
  week: number | null;
  startsAt: Date;
  status: GrowthEventStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  venueId: string | null;
  venueName: string | null;
  neutralSite: boolean;
  marketId: string | null;
  leagueId: string | null;
  seasonId: string | null;
}, next: {
  name: string;
  season: number;
  week: number;
  startsAt: Date;
  status: GrowthEventStatus;
  homeTeamId: string;
  awayTeamId: string;
  venueId: string;
  venueName: string;
  neutralSite: boolean;
  marketId: string | null;
  leagueId: string;
  seasonId: string;
}) {
  return existing.name !== next.name || existing.season !== next.season || existing.week !== next.week || existing.startsAt.getTime() !== next.startsAt.getTime() || existing.status !== next.status || existing.homeTeamId !== next.homeTeamId || existing.awayTeamId !== next.awayTeamId || existing.venueId !== next.venueId || existing.venueName !== next.venueName || existing.neutralSite !== next.neutralSite || existing.marketId !== next.marketId || existing.leagueId !== next.leagueId || existing.seasonId !== next.seasonId;
}

async function foundationCounts(prisma: PrismaClient) {
  const [markets, venues, teams] = await Promise.all([
    prisma.market.findMany({ where: { key: { in: [...new Set(nflTeams.map((team) => team.marketKey))] } }, select: { key: true } }),
    prisma.venue.findMany({ where: { key: { in: nflVenues.map((venue) => venue.key) } }, select: { key: true } }),
    prisma.team.findMany({ where: { key: { in: nflTeams.map((team) => team.key) } }, select: { key: true } }),
  ]);
  return {
    marketsCreated: new Set(nflTeams.map((team) => team.marketKey)).size - markets.length,
    venuesCreated: nflVenues.length - venues.length,
    teamsCreated: nflTeams.length - teams.length,
  };
}

async function ensureFoundation(prisma: PrismaClient, seasonYear: number) {
  const sport = await prisma.sport.upsert({ where: { code: "FOOTBALL" }, create: { key: "football", code: "FOOTBALL", name: "Football" }, update: { key: "football", name: "Football", active: true } });
  const league = await prisma.league.upsert({ where: { code: "NFL" }, create: { sportId: sport.id, key: "nfl", code: "NFL", name: "National Football League" }, update: { sportId: sport.id, key: "nfl", name: "National Football League", active: true } });
  const season = await prisma.sportsSeason.upsert({ where: { league_year: { league: "NFL", year: seasonYear } }, create: { league: "NFL", leagueId: league.id, year: seasonYear, label: `NFL ${seasonYear}` }, update: { leagueId: league.id } });
  const marketDefinitions = [...new Map(nflTeams.map((team) => [team.marketKey, { key: team.marketKey, name: team.marketName, region: team.region }])).values()];
  for (const definition of marketDefinitions) {
    const existing = await prisma.market.findUnique({ where: { key: definition.key } });
    if (!existing) await prisma.market.create({ data: definition });
  }
  const markets = new Map((await prisma.market.findMany({ where: { key: { in: marketDefinitions.map((market) => market.key) } } })).map((market) => [market.key, market]));

  const homeMarketByVenue = new Map<string, string>();
  for (const team of nflTeams) if (!homeMarketByVenue.has(team.homeVenueKey)) homeMarketByVenue.set(team.homeVenueKey, team.marketKey);

  for (const definition of nflVenues) {
    const existing = await prisma.venue.findUnique({ where: { key: definition.key } });
    const marketId = markets.get(homeMarketByVenue.get(definition.key) ?? "")?.id ?? null;
    if (!existing) {
      await prisma.venue.create({ data: { key: definition.key, name: definition.name, city: definition.city, state: definition.state, country: definition.country, timeZone: definition.timeZone, source: NFL_FOUNDATION_SOURCE, externalId: definition.key, stadiumSlopVenueKey: definition.key, marketId } });
    } else {
      const fill: Prisma.VenueUpdateInput = {};
      if (!existing.timeZone) fill.timeZone = definition.timeZone;
      if (!existing.source) fill.source = NFL_FOUNDATION_SOURCE;
      if (!existing.externalId) fill.externalId = definition.key;
      if (!existing.stadiumSlopVenueKey) fill.stadiumSlopVenueKey = definition.key;
      if (!existing.marketId && marketId) fill.market = { connect: { id: marketId } };
      if (Object.keys(fill).length) await prisma.venue.update({ where: { id: existing.id }, data: fill });
    }
  }
  const venues = new Map((await prisma.venue.findMany({ where: { key: { in: nflVenues.map((venue) => venue.key) } } })).map((venue) => [venue.key, venue]));

  for (const definition of nflTeams) {
    const existing = await prisma.team.findUnique({ where: { key: definition.key } });
    const market = markets.get(definition.marketKey)!;
    const venue = venues.get(definition.homeVenueKey)!;
    if (!existing) {
      await prisma.team.create({ data: { key: definition.key, name: definition.name, marketId: market.id, sport: "Football", league: "NFL", leagueId: league.id, abbreviation: definition.abbreviation, externalSource: NFL_FOUNDATION_SOURCE, externalId: definition.abbreviation, venueName: venue.name, homeVenueId: venue.id } });
    } else {
      const fill: Prisma.TeamUpdateInput = {};
      if (!existing.abbreviation) fill.abbreviation = definition.abbreviation;
      if (!existing.externalSource) fill.externalSource = NFL_FOUNDATION_SOURCE;
      if (!existing.externalId) fill.externalId = definition.abbreviation;
      if (!existing.homeVenueId) fill.homeVenue = { connect: { id: venue.id } };
      if (!existing.leagueId) fill.canonicalLeague = { connect: { id: league.id } };
      if (!existing.venueName) fill.venueName = venue.name;
      if (Object.keys(fill).length) await prisma.team.update({ where: { id: existing.id }, data: fill });
    }
  }
  return { leagueId: league.id, seasonId: season.id };
}

export async function importNflSchedule(prisma: PrismaClient, fixture: NflFixture, options: { apply: boolean }): Promise<NflImportSummary> {
  const plan = buildNflImportPlan(fixture);
  if (plan.unresolved.length) throw new Error(`NFL fixture has ${plan.unresolved.length} unresolved mappings: ${plan.unresolved[0].reason}`);

  const foundation = await foundationCounts(prisma);
  const normalized = options.apply
    ? await ensureFoundation(prisma, fixture.season)
    : await (async () => {
        if (!(prisma as unknown as { league?: unknown }).league || !(prisma as unknown as { sportsSeason?: unknown }).sportsSeason) return { leagueId: "", seasonId: "" };
        const league = await prisma.league.findUnique({ where: { code: "NFL" }, select: { id: true } });
        const season = await prisma.sportsSeason.findUnique({ where: { league_year: { league: "NFL", year: fixture.season } }, select: { id: true } });
        return league && season ? { leagueId: league.id, seasonId: season.id } : { leagueId: "", seasonId: "" };
      })();

  const [teams, venues, existingEvents] = await Promise.all([
    prisma.team.findMany({ where: { key: { in: nflTeams.map((team) => team.key) } }, select: { id: true, key: true, marketId: true } }),
    prisma.venue.findMany({ where: { key: { in: nflVenues.map((venue) => venue.key) } }, select: { id: true, key: true, marketId: true } }),
    prisma.growthEvent.findMany({ where: { source: NFL_FOUNDATION_SOURCE, sourceEventId: { in: plan.mapped.map((event) => event.sourceEventId) } } }),
  ]);
  const teamIds = new Map(teams.map((team) => [team.key, team]));
  const venueIds = new Map(venues.map((venue) => [venue.key, venue]));
  const existingById = new Map(existingEvents.map((event) => [event.sourceEventId, event]));

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const importedAt = new Date();

  for (const event of plan.mapped) {
    const homeTeam = teamIds.get(event.homeTeamKey);
    const awayTeam = teamIds.get(event.awayTeamKey);
    const venue = venueIds.get(event.venueKey);
    if (!options.apply && (!homeTeam || !awayTeam || !venue)) {
      created += 1;
      continue;
    }
    if (!homeTeam || !awayTeam || !venue) throw new Error(`Foundation records missing for event ${event.sourceEventId}`);

    const marketId = event.neutralSite ? venue.marketId : homeTeam.marketId;
    const data = { name: event.name, type: "GAME" as const, sport: "Football", league: "NFL", leagueId: normalized.leagueId, season: event.season, seasonId: normalized.seasonId, week: event.week, status: event.status, startsAt: event.startsAt, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, venueId: venue.id, venueName: event.venueName, neutralSite: event.neutralSite, marketId, key: event.key, source: NFL_FOUNDATION_SOURCE, sourceEventId: event.sourceEventId, sourceUpdatedAt: event.sourceUpdatedAt, importedAt, sourceMetadata: event.sourceMetadata };
    const existing = existingById.get(event.sourceEventId);
    if (!existing) {
      created += 1;
      if (options.apply) await prisma.growthEvent.create({ data: { ...data, teams: { connect: [{ id: homeTeam.id }, { id: awayTeam.id }] } } });
    } else if (changed(existing, data)) {
      updated += 1;
      if (options.apply) await prisma.growthEvent.update({ where: { id: existing.id }, data: { ...data, teams: { set: [{ id: homeTeam.id }, { id: awayTeam.id }] } } });
    } else {
      unchanged += 1;
    }
  }

  const sourceIds = new Set(plan.mapped.map((event) => event.sourceEventId));
  const missingExistingEvents = (await prisma.growthEvent.count({ where: { source: NFL_FOUNDATION_SOURCE, sourceEventId: { notIn: [...sourceIds] } } }));
  const summary = { dryRun: !options.apply, fixtureEvents: fixture.events.length, mapped: plan.mapped.length, created, updated, unchanged, missingExistingEvents, unresolved: plan.unresolved, foundation };

  if (options.apply) await prisma.auditEvent.create({ data: { action: "game_day.nfl_import", entityType: "GrowthEvent", metadata: { ...summary, importerVersion: NFL_IMPORTER_VERSION, source: NFL_FOUNDATION_SOURCE } } });
  return summary;
}
