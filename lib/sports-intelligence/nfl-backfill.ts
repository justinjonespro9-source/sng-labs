import type { PrismaClient } from "@prisma/client";

export const SPORTS_INTELLIGENCE_BACKFILL_VERSION = "sports-intelligence-v2-nfl-backfill-v1";

export async function inspectNflNormalization(prisma: PrismaClient) {
  const [teams, events, seasons, teamLinks, eventLinks, seasonLinks, factualPlayers, factualDefenses, snapshots, derived, resultSets, entries] = await Promise.all([
    prisma.team.count({ where: { league: "NFL" } }),
    prisma.growthEvent.count({ where: { league: "NFL" } }),
    prisma.sportsSeason.count({ where: { league: "NFL" } }),
    prisma.team.count({ where: { league: "NFL", leagueId: { not: null } } }),
    prisma.growthEvent.count({ where: { league: "NFL", leagueId: { not: null }, seasonId: { not: null } } }),
    prisma.sportsSeason.count({ where: { league: "NFL", leagueId: { not: null } } }),
    prisma.nflPlayerEventStat.count(),
    prisma.nflDefenseEventStat.count(),
    prisma.sportsScoringInputSnapshot.count(),
    prisma.sportsDerivedPerformance.count(),
    prisma.sportsWeeklyResultSet.count(),
    prisma.sportsWeeklyResultEntry.count(),
  ]);
  return { teams, events, seasons, normalized: { teams: teamLinks, events: eventLinks, seasons: seasonLinks }, protectedCounts: { factualPlayers, factualDefenses, snapshots, derived, resultSets, entries } };
}

export async function applyNflNormalization(prisma: PrismaClient) {
  const before = await inspectNflNormalization(prisma);
  const result = await prisma.$transaction(async (tx) => {
    const sport = await tx.sport.upsert({ where: { code: "FOOTBALL" }, create: { key: "football", code: "FOOTBALL", name: "Football" }, update: { key: "football", name: "Football", active: true } });
    const league = await tx.league.upsert({ where: { code: "NFL" }, create: { sportId: sport.id, key: "nfl", code: "NFL", name: "National Football League" }, update: { sportId: sport.id, key: "nfl", name: "National Football League", active: true } });
    const seasons = await tx.sportsSeason.updateMany({ where: { league: "NFL", leagueId: null }, data: { leagueId: league.id } });
    const teams = await tx.team.updateMany({ where: { league: "NFL", leagueId: null }, data: { leagueId: league.id } });
    const nflSeasons = await tx.sportsSeason.findMany({ where: { league: "NFL" }, select: { id: true, year: true } });
    let events = 0;
    for (const season of nflSeasons) {
      const changed = await tx.growthEvent.updateMany({ where: { league: "NFL", season: season.year, OR: [{ leagueId: null }, { seasonId: null }] }, data: { leagueId: league.id, seasonId: season.id } });
      events += changed.count;
    }
    const legacyLinks = await tx.team.findMany({ where: { league: "NFL", brands: { some: {} } }, select: { id: true, brands: { select: { id: true } } } });
    let relevancePolicies = 0;
    for (const team of legacyLinks) for (const brand of team.brands) {
      const existing = await tx.brandSportsRelevance.findFirst({ where: { brandId: brand.id, teamId: team.id, source: "LEGACY_TEAM_LINK" } });
      if (!existing) {
        await tx.brandSportsRelevance.create({ data: { brandId: brand.id, scope: "TEAM", source: "LEGACY_TEAM_LINK", teamId: team.id, rationale: "Backfilled from the existing Team–Brand strategic relevance relationship.", ruleVersion: SPORTS_INTELLIGENCE_BACKFILL_VERSION } });
        relevancePolicies++;
      }
    }
    await tx.auditEvent.create({ data: { action: "sports_intelligence.nfl_identity_backfill", entityType: "League", entityId: league.id, metadata: { version: SPORTS_INTELLIGENCE_BACKFILL_VERSION, teams: teams.count, seasons: seasons.count, events, relevancePolicies } } });
    return { sportId: sport.id, leagueId: league.id, teams: teams.count, seasons: seasons.count, events, relevancePolicies };
  }, { isolationLevel: "Serializable" });
  const after = await inspectNflNormalization(prisma);
  if (JSON.stringify(before.protectedCounts) !== JSON.stringify(after.protectedCounts)) throw new Error("Protected Sports Data Hub counts changed during normalized identity backfill");
  return { before, result, after };
}
