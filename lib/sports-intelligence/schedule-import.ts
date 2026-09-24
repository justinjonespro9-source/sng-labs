import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { sportsSchedulePackageSchema, type SportsSchedulePackage } from "./source-schema";

export const SPORTS_INTELLIGENCE_IMPORTER_VERSION = "sports-intelligence-schedule-v1";

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function schedulePackageChecksum(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function validateSchedulePackage(value: unknown) {
  const pkg = sportsSchedulePackageSchema.parse(value);
  const duplicate = (values: string[]) => values.find((value, index) => values.indexOf(value) !== index);
  const duplicateTeam = duplicate(pkg.teams.map((item) => item.key));
  const duplicateVenue = duplicate(pkg.venues.map((item) => item.key));
  const duplicateEvent = duplicate(pkg.events.map((item) => item.externalId));
  if (duplicateTeam) throw new Error(`Duplicate team key: ${duplicateTeam}`);
  if (duplicateVenue) throw new Error(`Duplicate venue key: ${duplicateVenue}`);
  if (duplicateEvent) throw new Error(`Duplicate source event: ${duplicateEvent}`);
  const teamKeys = new Set(pkg.teams.map((item) => item.key));
  const venueKeys = new Set(pkg.venues.map((item) => item.key));
  const marketKeys = new Set(pkg.markets.map((item) => item.key));
  for (const team of pkg.teams) {
    if (!marketKeys.has(team.marketKey)) throw new Error(`Unresolved market for team ${team.key}: ${team.marketKey}`);
    if (team.homeVenueKey && !venueKeys.has(team.homeVenueKey)) throw new Error(`Unresolved home venue for team ${team.key}: ${team.homeVenueKey}`);
  }
  for (const venue of pkg.venues) if (venue.marketKey && !marketKeys.has(venue.marketKey)) throw new Error(`Unresolved market for venue ${venue.key}: ${venue.marketKey}`);
  for (const event of pkg.events) {
    if (!teamKeys.has(event.homeTeamKey)) throw new Error(`Unresolved home team: ${event.homeTeamKey}`);
    if (!teamKeys.has(event.awayTeamKey)) throw new Error(`Unresolved away team: ${event.awayTeamKey}`);
    if (!venueKeys.has(event.venueKey)) throw new Error(`Unresolved venue: ${event.venueKey}`);
    if (event.timeTbd !== (event.status === "TIME_TBD")) throw new Error(`Event ${event.externalId} timeTbd/status mismatch`);
  }
  return pkg;
}

export type SchedulePlan = {
  checksum: string;
  package: SportsSchedulePackage;
  creates: number;
  updates: number;
  unchanged: number;
  records: { rowNumber: number; status: "CREATE" | "UPDATE" | "UNCHANGED"; normalizedData: Record<string, unknown> }[];
};

export async function buildSchedulePlan(prisma: PrismaClient, input: unknown): Promise<SchedulePlan> {
  const pkg = validateSchedulePackage(input);
  const provider = pkg.source.provider;
  const existing = await prisma.growthEventExternalIdentity.findMany({
    where: { provider, externalId: { in: pkg.events.map((event) => event.externalId) } },
    include: { event: true },
  });
  const byExternalId = new Map(existing.map((identity) => [identity.externalId, identity.event]));
  const records = pkg.events.map((event, index) => {
    const prior = byExternalId.get(event.externalId);
    const startsAt = new Date(event.startsAt);
    const changed = prior && (prior.startsAt.getTime() !== startsAt.getTime() || prior.status !== event.status || prior.neutralSite !== event.neutralSite);
    return { rowNumber: index + 1, status: prior ? changed ? "UPDATE" as const : "UNCHANGED" as const : "CREATE" as const, normalizedData: { ...event, startsAt: startsAt.toISOString() } };
  });
  return {
    checksum: schedulePackageChecksum(pkg),
    package: pkg,
    creates: records.filter((record) => record.status === "CREATE").length,
    updates: records.filter((record) => record.status === "UPDATE").length,
    unchanged: records.filter((record) => record.status === "UNCHANGED").length,
    records,
  };
}

export async function previewSchedulePackage(prisma: PrismaClient, input: unknown, createdById?: string) {
  const plan = await buildSchedulePlan(prisma, input);
  const existing = await prisma.sportsIngestionRun.findFirst({ where: { type: "SCHEDULE", checksum: plan.checksum }, include: { records: true } });
  if (existing) return { run: existing, plan, reused: true };
  const league = await prisma.league.findUnique({ where: { code: plan.package.league.code } });
  const season = league ? await prisma.sportsSeason.findUnique({ where: { league_year: { league: plan.package.league.code, year: plan.package.season.year } } }) : null;
  const run = await prisma.sportsIngestionRun.create({ data: {
    createdById,
    leagueId: league?.id,
    seasonId: season?.id,
    type: "SCHEDULE",
    status: "PREVIEWED",
    sourceType: "OFFICIAL_OPERATOR_REVIEWED",
    sourceLabel: plan.package.source.label,
    sourceReference: plan.package.source.reference,
    checksum: plan.checksum,
    parserVersion: SPORTS_INTELLIGENCE_IMPORTER_VERSION,
    rawPayload: stableJson(plan.package),
    createdCount: plan.creates,
    updatedCount: plan.updates,
    unchangedCount: plan.unchanged,
    records: { create: plan.records.map((record) => ({ rowNumber: record.rowNumber, status: record.status, rawData: plan.package.events[record.rowNumber - 1] as Prisma.InputJsonValue, normalizedData: record.normalizedData as Prisma.InputJsonValue })) },
  }, include: { records: true } });
  return { run, plan, reused: false };
}

export async function applyScheduleRun(prisma: PrismaClient, runId: string) {
  const run = await prisma.sportsIngestionRun.findUnique({ where: { id: runId } });
  if (!run || run.type !== "SCHEDULE") throw new Error("Schedule preview run not found");
  if (run.status === "APPLIED") return { runId: run.id, reused: true };
  const raw = JSON.parse(run.rawPayload) as unknown;
  const plan = await buildSchedulePlan(prisma, raw);
  if (plan.checksum !== run.checksum) throw new Error("Schedule payload checksum changed after preview");
  const pkg = plan.package;
  return prisma.$transaction(async (tx) => {
    const sport = await tx.sport.upsert({ where: { code: pkg.sport.code }, create: pkg.sport, update: { key: pkg.sport.key, name: pkg.sport.name, active: true } });
    const league = await tx.league.upsert({ where: { code: pkg.league.code }, create: { ...pkg.league, sportId: sport.id }, update: { key: pkg.league.key, name: pkg.league.name, subdivision: pkg.league.subdivision, sportId: sport.id, active: true } });
    const season = await tx.sportsSeason.upsert({ where: { league_year: { league: pkg.league.code, year: pkg.season.year } }, create: { league: pkg.league.code, leagueId: league.id, year: pkg.season.year, label: pkg.season.label }, update: { leagueId: league.id, label: pkg.season.label } });
    const markets = new Map<string, { id: string }>();
    for (const item of pkg.markets) markets.set(item.key, await tx.market.upsert({ where: { key: item.key }, create: item, update: { name: item.name, region: item.region, country: item.country, active: true }, select: { id: true } }));
    const venues = new Map<string, { id: string; marketId: string | null; name: string }>();
    for (const item of pkg.venues) {
      const venue = await tx.venue.upsert({ where: { key: item.key }, create: { key: item.key, name: item.name, city: item.city, state: item.state, country: item.country, timeZone: item.timeZone, marketId: item.marketKey ? markets.get(item.marketKey)?.id : null }, update: { name: item.name, city: item.city, state: item.state, country: item.country, timeZone: item.timeZone, marketId: item.marketKey ? markets.get(item.marketKey)?.id : null } });
      venues.set(item.key, venue);
      await tx.venueExternalIdentity.upsert({ where: { provider_externalId: { provider: pkg.source.provider, externalId: item.externalId } }, create: { venueId: venue.id, provider: pkg.source.provider, externalId: item.externalId, sourceLabel: pkg.source.label, sourceReference: pkg.source.reference, verifiedAt: new Date(pkg.source.review.reviewedAt) }, update: { venueId: venue.id, sourceLabel: pkg.source.label, sourceReference: pkg.source.reference, verifiedAt: new Date(pkg.source.review.reviewedAt) } });
    }
    const teams = new Map<string, { id: string; marketId: string; name: string }>();
    for (const item of pkg.teams) {
      const team = await tx.team.upsert({ where: { key: item.key }, create: { key: item.key, name: item.name, marketId: markets.get(item.marketKey)!.id, sport: pkg.sport.name, league: pkg.league.code, leagueId: league.id, abbreviation: item.abbreviation, homeVenueId: item.homeVenueKey ? venues.get(item.homeVenueKey)?.id : null }, update: { name: item.name, marketId: markets.get(item.marketKey)!.id, sport: pkg.sport.name, league: pkg.league.code, leagueId: league.id, abbreviation: item.abbreviation, homeVenueId: item.homeVenueKey ? venues.get(item.homeVenueKey)?.id : null } });
      teams.set(item.key, team);
      await tx.teamExternalIdentity.upsert({ where: { provider_externalId: { provider: pkg.source.provider, externalId: item.externalId } }, create: { teamId: team.id, provider: pkg.source.provider, externalId: item.externalId, sourceLabel: pkg.source.label, sourceReference: pkg.source.reference, verifiedAt: new Date(pkg.source.review.reviewedAt) }, update: { teamId: team.id, sourceLabel: pkg.source.label, sourceReference: pkg.source.reference, verifiedAt: new Date(pkg.source.review.reviewedAt) } });
    }
    for (const item of pkg.events) {
      const home = teams.get(item.homeTeamKey)!;
      const away = teams.get(item.awayTeamKey)!;
      const venue = venues.get(item.venueKey)!;
      const identity = await tx.growthEventExternalIdentity.findUnique({ where: { provider_externalId: { provider: pkg.source.provider, externalId: item.externalId } } });
      const data = { name: `${away.name} at ${home.name}`, type: "GAME" as const, sport: pkg.sport.name, league: pkg.league.code, leagueId: league.id, season: pkg.season.year, seasonId: season.id, week: item.week, status: item.status, startsAt: new Date(item.startsAt), homeTeamId: home.id, awayTeamId: away.id, venueId: venue.id, venueName: venue.name, neutralSite: item.neutralSite, marketId: item.neutralSite ? venue.marketId : home.marketId, source: pkg.source.provider, sourceEventId: item.externalId, sourceUpdatedAt: new Date(pkg.source.publishedAt), importedAt: new Date(), sourceMetadata: { importerVersion: SPORTS_INTELLIGENCE_IMPORTER_VERSION, sourceLabel: pkg.source.label, sourceReference: pkg.source.reference, acquiredAt: pkg.source.acquiredAt, reviewedAt: pkg.source.review.reviewedAt, reviewer: pkg.source.review.reviewer, timeTbd: item.timeTbd, sourceStatus: item.sourceStatus } };
      const event = identity ? await tx.growthEvent.update({ where: { id: identity.eventId }, data: { ...data, teams: { set: [{ id: home.id }, { id: away.id }] } } }) : await tx.growthEvent.create({ data: { key: `${pkg.league.code.toLowerCase()}-${pkg.season.year}-${item.externalId.toLowerCase()}`, ...data, teams: { connect: [{ id: home.id }, { id: away.id }] } } });
      if (!identity) await tx.growthEventExternalIdentity.create({ data: { eventId: event.id, provider: pkg.source.provider, externalId: item.externalId, sourceLabel: pkg.source.label, sourceReference: pkg.source.reference, verifiedAt: new Date(pkg.source.review.reviewedAt) } });
    }
    await tx.sportsIngestionRun.update({ where: { id: run.id }, data: { leagueId: league.id, seasonId: season.id, status: "APPLIED", appliedAt: new Date() } });
    await tx.auditEvent.create({ data: { action: "sports_intelligence.schedule.apply", entityType: "SportsIngestionRun", entityId: run.id, metadata: { checksum: run.checksum, league: pkg.league.code, season: pkg.season.year, events: pkg.events.length } } });
    return { runId: run.id, reused: false, checksum: run.checksum, events: pkg.events.length };
  }, { isolationLevel: "Serializable" });
}
