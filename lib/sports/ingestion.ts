import { Prisma, type PrismaClient, type SportsIngestionRecordStatus } from "@prisma/client";
import { resolveParticipantIdentity, type IdentityCandidate } from "./identity";
import { checksumImport, rosterPayloadSchema, SNG_ROSTER_EXPORT_VERSION, SPORTS_IMPORT_PARSER_VERSION } from "./import-schema";
import { activeMembershipDeactivationWhere } from "./roster-history";

type PlannedRow = {
  rowNumber: number;
  status: SportsIngestionRecordStatus;
  rawData: Prisma.InputJsonValue;
  normalizedData: Prisma.InputJsonValue;
  participantId?: string;
  message?: string;
};

async function getPrisma(client?: PrismaClient) {
  if (client) return client;
  return (await import("@/lib/prisma")).prisma;
}

async function loadCandidates(client: PrismaClient): Promise<IdentityCandidate[]> {
  const participants = await client.sportsParticipant.findMany({
    include: {
      aliases: true,
      externalIdentities: true,
      rosterMemberships: { include: { season: true, team: true } },
    },
  });
  return participants.map((participant) => ({
    id: participant.id,
    canonicalName: participant.canonicalName,
    kind: participant.kind,
    aliases: participant.aliases.map((alias) => alias.alias),
    externalIdentities: participant.externalIdentities.map(({ provider, externalId }) => ({ provider, externalId })),
    memberships: participant.rosterMemberships.map((membership) => ({
      league: membership.season.league,
      year: membership.season.year,
      teamAbbreviation: membership.team.abbreviation ?? "",
      position: membership.fantasyPosition,
    })),
  }));
}

async function resolveSupersededLeagueExportIssues(
  client: PrismaClient | Prisma.TransactionClient,
  input: { runId: string; seasonId: string; sourceLabel: string; contractVersion?: string },
) {
  if (input.contractVersion !== SNG_ROSTER_EXPORT_VERSION) return 0;
  const result = await client.sportsDataQualityIssue.updateMany({
    where: {
      status: "OPEN",
      ingestionRun: {
        is: {
          id: { not: input.runId },
          seasonId: input.seasonId,
          type: "SEASON_ROSTER",
          sourceLabel: input.sourceLabel,
        },
      },
    },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  return result.count;
}

export async function previewRosterImport(rawPayload: string, actorId?: string | null, injectedClient?: PrismaClient) {
  const prisma = await getPrisma(injectedClient);
  const payload = rosterPayloadSchema.parse(JSON.parse(rawPayload));
  const checksum = checksumImport(rawPayload);
  const season = await prisma.sportsSeason.findUnique({ where: { league_year: { league: payload.league, year: payload.year } } });
  if (!season) throw new Error("NFL 2026 sports foundation must be seeded before roster preview");
  const existing = await prisma.sportsIngestionRun.findUnique({
    where: { type_checksum_seasonId: { type: "SEASON_ROSTER", checksum, seasonId: season.id } },
    include: { records: { orderBy: { rowNumber: "asc" } } },
  });
  if (existing) return existing;

  const [candidates, teams] = await Promise.all([
    loadCandidates(prisma),
    prisma.team.findMany({ where: { league: "NFL" } }),
  ]);
  const teamByAbbreviation = new Map(teams.map((team) => [team.abbreviation, team]));
  const planned: PlannedRow[] = payload.rows.map((row, index) => {
    const team = teamByAbbreviation.get(row.teamAbbreviation);
    const normalizedData = { ...row, league: payload.league, year: payload.year } as Prisma.InputJsonValue;
    if (!team) return { rowNumber: index + 1, status: "ERROR", rawData: row, normalizedData, message: `Unknown canonical NFL team ${row.teamAbbreviation}` };
    const resolution = resolveParticipantIdentity({ ...row, name: row.canonicalName, league: payload.league, year: payload.year }, candidates);
    if (resolution.kind === "AMBIGUOUS") return { rowNumber: index + 1, status: "UNRESOLVED", rawData: row, normalizedData, message: resolution.reason };
    if (resolution.kind === "CREATE") return { rowNumber: index + 1, status: "CREATE", rawData: row, normalizedData };
    const membership = resolution.candidate.memberships.find((item) => item.league === payload.league && item.year === payload.year && item.teamAbbreviation === row.teamAbbreviation);
    return { rowNumber: index + 1, status: membership ? "UNCHANGED" : "UPDATE", rawData: row, normalizedData, participantId: resolution.candidate.id, message: `Matched by ${resolution.method}` };
  });
  const count = (status: SportsIngestionRecordStatus) => planned.filter((row) => row.status === status).length;
  return prisma.sportsIngestionRun.create({
    data: {
      createdById: actorId ?? null,
      seasonId: season.id,
      type: "SEASON_ROSTER",
      status: "PREVIEWED",
      sourceType: "OPERATOR_JSON",
      sourceLabel: payload.sourceLabel,
      sourceReference: payload.sourceReference,
      checksum,
      parserVersion: SPORTS_IMPORT_PARSER_VERSION,
      rawPayload,
      createdCount: count("CREATE"),
      updatedCount: count("UPDATE"),
      unchangedCount: count("UNCHANGED"),
      unresolvedCount: count("UNRESOLVED"),
      errorCount: count("ERROR"),
      records: { create: planned },
      qualityIssues: {
        create: planned.filter((row) => row.status === "UNRESOLVED" || row.status === "ERROR").map((row) => ({
          type: row.status === "UNRESOLVED" ? "AMBIGUOUS_MATCH" : "UNRESOLVED_IDENTITY",
          summary: row.message ?? "Roster identity requires operator review",
          details: row.normalizedData,
        })),
      },
    },
    include: { records: { orderBy: { rowNumber: "asc" } } },
  });
}

export async function applyRosterImport(runId: string, actorId?: string | null, injectedClient?: PrismaClient) {
  const prisma = await getPrisma(injectedClient);
  const run = await prisma.sportsIngestionRun.findUnique({ where: { id: runId }, include: { records: { orderBy: { rowNumber: "asc" } }, season: true } });
  if (!run || !run.season) throw new Error("Roster import preview not found");
  const season = run.season;
  const payload = rosterPayloadSchema.parse(JSON.parse(run.rawPayload));
  if (run.status === "APPLIED") {
    const resolvedCount = await resolveSupersededLeagueExportIssues(prisma, {
      runId: run.id,
      seasonId: season.id,
      sourceLabel: run.sourceLabel,
      contractVersion: payload.contractVersion,
    });
    if (resolvedCount > 0) {
      await prisma.auditEvent.create({ data: { actorId: actorId ?? null, action: "SPORTS_DATA_QUALITY_ISSUES_SUPERSEDED", entityType: "SportsIngestionRun", entityId: run.id, metadata: { resolvedCount } } });
    }
    return run;
  }
  if (run.unresolvedCount > 0 || run.errorCount > 0) throw new Error("Resolve all ambiguous or invalid rows before applying");

  await prisma.$transaction(async (tx) => {
    for (const [index, row] of payload.rows.entries()) {
      const record = run.records[index];
      const team = await tx.team.findUnique({ where: { league_abbreviation: { league: "NFL", abbreviation: row.teamAbbreviation } } });
      if (!team) throw new Error(`Canonical team ${row.teamAbbreviation} is missing`);
      let participantId = record?.participantId;
      if (!participantId) {
        const participant = await tx.sportsParticipant.create({
          data: {
            kind: "PLAYER",
            canonicalName: row.canonicalName,
            player: { create: {} },
          },
        });
        participantId = participant.id;
      }
      await tx.participantExternalIdentity.upsert({
        where: { provider_externalId: { provider: row.provider, externalId: row.externalId } },
        update: { sourceLabel: payload.sourceLabel, sourceReference: payload.sourceReference, verifiedAt: new Date() },
        create: { participantId, provider: row.provider, externalId: row.externalId, sourceLabel: payload.sourceLabel, sourceReference: payload.sourceReference, verifiedAt: new Date() },
      });
      for (const alias of row.aliases) {
        const normalizedAlias = alias.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        await tx.participantAlias.upsert({
          where: { participantId_normalizedAlias: { participantId, normalizedAlias } },
          update: { alias, sourceLabel: payload.sourceLabel },
          create: { participantId, alias, normalizedAlias, sourceLabel: payload.sourceLabel },
        });
      }
      const deactivationWhere = activeMembershipDeactivationWhere({
        seasonId: season.id,
        participantId,
        teamId: team.id,
        active: row.active,
      });
      if (deactivationWhere) {
        await tx.seasonRosterMembership.updateMany({
          where: deactivationWhere,
          data: { active: false },
        });
      }
      await tx.seasonRosterMembership.upsert({
        where: { seasonId_participantId_teamId: { seasonId: season.id, participantId, teamId: team.id } },
        update: { fantasyPosition: row.fantasyPosition, sourcePosition: row.sourcePosition, status: row.status, active: row.active, jerseyNumber: row.jerseyNumber, sourceLabel: payload.sourceLabel, sourceReference: payload.sourceReference },
        create: { seasonId: season.id, participantId, teamId: team.id, fantasyPosition: row.fantasyPosition, sourcePosition: row.sourcePosition, status: row.status, active: row.active, jerseyNumber: row.jerseyNumber, sourceLabel: payload.sourceLabel, sourceReference: payload.sourceReference },
      });
      if (record) await tx.sportsIngestionRecord.update({ where: { id: record.id }, data: { participantId } });
    }
    const resolvedSupersededIssues = await resolveSupersededLeagueExportIssues(tx, {
      runId: run.id,
      seasonId: season.id,
      sourceLabel: run.sourceLabel,
      contractVersion: payload.contractVersion,
    });
    await tx.sportsIngestionRun.update({ where: { id: run.id }, data: { status: "APPLIED", appliedAt: new Date(), createdById: actorId ?? run.createdById } });
    await tx.auditEvent.create({ data: { actorId: actorId ?? null, action: "SPORTS_ROSTER_IMPORT_APPLIED", entityType: "SportsIngestionRun", entityId: run.id, metadata: { checksum: run.checksum, sourceLabel: run.sourceLabel, rowCount: run.records.length, resolvedSupersededIssues } } });
  }, {
    maxWait: 30_000,
    timeout: 600_000,
  });
  return prisma.sportsIngestionRun.findUniqueOrThrow({ where: { id: run.id }, include: { records: true } });
}
