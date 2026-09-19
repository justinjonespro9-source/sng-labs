import type { PrismaClient } from "@prisma/client";

export async function seedSportsIdentityFoundation(prisma: PrismaClient) {
  const season = await prisma.sportsSeason.upsert({
    where: { league_year: { league: "NFL", year: 2026 } },
    update: {},
    create: { league: "NFL", year: 2026, label: "NFL 2026", active: true },
  });
  const teams = await prisma.team.findMany({ where: { league: "NFL", active: true }, orderBy: { name: "asc" } });
  for (const team of teams) {
    const existing = await prisma.teamDefense.findUnique({ where: { teamId: team.id } });
    if (existing) continue;
    await prisma.sportsParticipant.create({
      data: {
        kind: "TEAM_DEFENSE",
        canonicalName: `${team.name} D/ST`,
        teamDefense: { create: { teamId: team.id } },
        externalIdentities: { create: { provider: "sng-team", externalId: team.key, sourceLabel: "SNG canonical NFL team foundation", verifiedAt: new Date() } },
        rosterMemberships: { create: { seasonId: season.id, teamId: team.id, fantasyPosition: "DEF", sourcePosition: "DEF", status: "ACTIVE", active: true, sourceLabel: "SNG canonical NFL team foundation" } },
      },
    });
  }
  return { season, teamCount: teams.length, defenseCount: await prisma.teamDefense.count({ where: { team: { league: "NFL" } } }) };
}
