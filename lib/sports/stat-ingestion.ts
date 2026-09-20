import {
  Prisma,
  type PrismaClient,
  type SportsDataQualityIssueType,
  type SportsIngestionRecordStatus,
} from "@prisma/client";
import { resolveParticipantIdentity, type IdentityCandidate } from "./identity";
import {
  checksumStatImport,
  DEFENSE_STAT_FIELDS,
  eventStatPayloadSchema,
  PLAYER_FACT_FIELDS,
  PLAYER_STAT_FIELDS,
  SPORTS_STAT_PARSER_VERSION,
  type EventStatRow,
} from "./stat-import-schema";
import { classifyFactChange, eventIncludesTeam, participantHasSeasonTeam } from "./stat-planning";

type PlannedStatRow = {
  rowNumber: number;
  status: SportsIngestionRecordStatus;
  rawData: Prisma.InputJsonValue;
  normalizedData: Prisma.InputJsonValue;
  participantId?: string;
  eventId?: string;
  message?: string;
  issueType?: SportsDataQualityIssueType;
};

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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

function factualSnapshot(row: EventStatRow): Record<string, string | number | null> {
  const fields = row.kind === "PLAYER" ? PLAYER_FACT_FIELDS : DEFENSE_STAT_FIELDS;
  const values = row as unknown as Record<string, string | number | null | undefined>;
  return Object.fromEntries(fields.map((field) => [field, values[field] ?? null]));
}

function existingSnapshot(existing: Record<string, unknown>, kind: EventStatRow["kind"]): Record<string, string | number | null> {
  const fields = kind === "PLAYER" ? PLAYER_FACT_FIELDS : DEFENSE_STAT_FIELDS;
  return Object.fromEntries(fields.map((field) => [field, typeof existing[field] === "number" || typeof existing[field] === "string" ? existing[field] as string | number : null]));
}

export async function previewEventStatImport(rawPayload: string, actorId?: string | null, injectedClient?: PrismaClient) {
  const prisma = await getPrisma(injectedClient);
  const payload = eventStatPayloadSchema.parse(JSON.parse(rawPayload));
  const checksum = checksumStatImport(rawPayload);
  const season = await prisma.sportsSeason.findUnique({ where: { league_year: { league: payload.league, year: payload.year } } });
  if (!season) throw new Error("NFL 2026 sports foundation must exist before event-stat preview");
  const firstKind = payload.rows[0].kind;
  const type = payload.correctionReason
    ? "EVENT_STAT_CORRECTION"
    : firstKind === "PLAYER" ? "PLAYER_EVENT_STATS" : "DEFENSE_EVENT_STATS";
  const existingRun = await prisma.sportsIngestionRun.findUnique({
    where: { type_checksum_seasonId: { type, checksum, seasonId: season.id } },
    include: { records: { orderBy: { rowNumber: "asc" } } },
  });
  if (existingRun) return existingRun;

  const [events, candidates, playerStats, defenseStats] = await Promise.all([
    prisma.growthEvent.findMany({
      where: { key: { in: payload.rows.map((row) => row.eventKey) }, league: "NFL", season: 2026 },
      include: { homeTeam: true, awayTeam: true },
    }),
    loadCandidates(prisma),
    prisma.nflPlayerEventStat.findMany({ where: { event: { key: { in: payload.rows.map((row) => row.eventKey) } } } }),
    prisma.nflDefenseEventStat.findMany({ where: { event: { key: { in: payload.rows.map((row) => row.eventKey) } } } }),
  ]);
  const eventByKey = new Map(events.map((event) => [event.key, event]));

  const planned: PlannedStatRow[] = payload.rows.map((row, index) => {
    const base = { rowNumber: index + 1, rawData: jsonValue(row), normalizedData: jsonValue({ ...row, league: payload.league, year: payload.year }) };
    const event = eventByKey.get(row.eventKey);
    if (!event) return { ...base, status: "INVALID", message: `Canonical NFL event ${row.eventKey} was not found`, issueType: "MISSING_EVENT" };
    const eventTeam = [event.homeTeam, event.awayTeam].find((team) => team?.abbreviation === row.teamAbbreviation);
    if (!eventTeam || !eventIncludesTeam(event, eventTeam.id)) {
      return { ...base, eventId: event.id, status: "INVALID", message: `${row.teamAbbreviation} does not participate in ${event.name}`, issueType: row.kind === "PLAYER" ? "PARTICIPANT_TEAM_MISMATCH" : "DEFENSE_TEAM_MISMATCH" };
    }

    let participant: IdentityCandidate | undefined;
    let matchMethod = "canonical team defense";
    if (row.kind === "PLAYER") {
      if (row.participationStatus === "UNKNOWN") {
        return { ...base, eventId: event.id, status: "INVALID", message: `${row.canonicalName} has unknown participation; factual completeness is not established`, issueType: "INCOMPLETE_EVENT_STATS" };
      }
      const resolution = resolveParticipantIdentity({
        provider: row.provider,
        externalId: row.externalId,
        name: row.canonicalName,
        kind: "PLAYER",
        league: "NFL",
        year: 2026,
        teamAbbreviation: row.teamAbbreviation,
        position: row.fantasyPosition,
      }, candidates);
      if (resolution.kind === "AMBIGUOUS") return { ...base, eventId: event.id, status: "UNRESOLVED", message: resolution.reason, issueType: "AMBIGUOUS_MATCH" };
      if (resolution.kind === "CREATE") return { ...base, eventId: event.id, status: "UNRESOLVED", message: `No canonical participant matches ${row.provider}:${row.externalId}`, issueType: "UNRESOLVED_IDENTITY" };
      participant = resolution.candidate;
      matchMethod = resolution.method;
      const hasTeam = participantHasSeasonTeam(participant.memberships, row.teamAbbreviation);
      if (!hasTeam) return { ...base, eventId: event.id, participantId: participant.id, status: "INVALID", message: `${participant.canonicalName} is not rostered with ${row.teamAbbreviation} for NFL 2026`, issueType: "PARTICIPANT_TEAM_MISMATCH" };
    } else {
      participant = candidates.find((candidate) => candidate.kind === "TEAM_DEFENSE" && candidate.memberships.some((membership) => membership.league === "NFL" && membership.year === 2026 && membership.teamAbbreviation === row.teamAbbreviation));
      if (!participant) return { ...base, eventId: event.id, status: "UNRESOLVED", message: `Canonical ${row.teamAbbreviation} D/ST identity was not found`, issueType: "UNRESOLVED_IDENTITY" };
    }

    const existing = row.kind === "PLAYER"
      ? playerStats.find((stat) => stat.participantId === participant!.id && stat.eventId === event.id)
      : defenseStats.find((stat) => stat.participantId === participant!.id && stat.eventId === event.id);
    const status = classifyFactChange({ existingFacts: existing ? existingSnapshot(existing as unknown as Record<string, unknown>, row.kind) : undefined, incomingFacts: factualSnapshot(row), existingFinality: existing?.finality, incomingFinality: row.finality, correctionReason: payload.correctionReason });
    if (status === "CREATE") return { ...base, eventId: event.id, participantId: participant.id, status, message: `Matched by ${matchMethod}` };
    if (status === "UNCHANGED") return { ...base, eventId: event.id, participantId: participant.id, status, message: "Canonical facts already match" };
    if (status === "CONFLICT") return { ...base, eventId: event.id, participantId: participant.id, status, message: "Different canonical facts already exist; resubmit as an explicit correction", issueType: "CONFLICTING_FACTUAL_INPUT" };
    return { ...base, eventId: event.id, participantId: participant.id, status, message: `Correction: ${payload.correctionReason}` };
  });

  const count = (status: SportsIngestionRecordStatus) => planned.filter((row) => row.status === status).length;
  return prisma.sportsIngestionRun.create({
    data: {
      createdById: actorId ?? null,
      seasonId: season.id,
      type,
      status: "PREVIEWED",
      sourceType: payload.sourceType,
      sourceLabel: payload.sourceLabel,
      sourceReference: payload.sourceReference,
      checksum,
      parserVersion: SPORTS_STAT_PARSER_VERSION,
      rawPayload,
      createdCount: count("CREATE"),
      updatedCount: count("UPDATE"),
      unchangedCount: count("UNCHANGED"),
      unresolvedCount: count("UNRESOLVED"),
      errorCount: count("INVALID") + count("CONFLICT") + count("ERROR"),
      records: { create: planned.map(({ rowNumber, status, rawData, normalizedData, participantId, eventId, message }) => ({ rowNumber, status, rawData, normalizedData, participantId, eventId, message })) },
      qualityIssues: {
        create: planned.filter((row) => row.issueType).map((row) => ({
          type: row.issueType!,
          participantId: row.participantId,
          eventId: row.eventId,
          summary: row.message ?? "Event statistics require operator review",
          details: row.normalizedData,
        })),
      },
    },
    include: { records: { orderBy: { rowNumber: "asc" } } },
  });
}

export async function applyEventStatImport(runId: string, actorId?: string | null, injectedClient?: PrismaClient) {
  const prisma = await getPrisma(injectedClient);
  const run = await prisma.sportsIngestionRun.findUnique({ where: { id: runId }, include: { records: { orderBy: { rowNumber: "asc" } } } });
  if (!run) throw new Error("Event-stat import preview not found");
  if (run.status === "APPLIED") return run;
  if (run.unresolvedCount > 0 || run.errorCount > 0) throw new Error("Resolve all unresolved, conflicting, or invalid rows before applying");
  const payload = eventStatPayloadSchema.parse(JSON.parse(run.rawPayload));

  await prisma.$transaction(async (tx) => {
    for (const [index, row] of payload.rows.entries()) {
      const record = run.records[index];
      if (!record?.participantId || !record.eventId || record.status === "UNCHANGED") continue;
      const provenance = {
        ingestionRunId: run.id,
        finality: payload.correctionReason ? "CORRECTED" as const : row.finality,
        sourceType: payload.sourceType,
        sourceLabel: payload.sourceLabel,
        sourceReference: payload.sourceReference,
        sourceTimestamp: payload.sourceTimestamp ? new Date(payload.sourceTimestamp) : null,
        importedAt: new Date(),
      };
      if (row.kind === "PLAYER") {
        const facts = factualSnapshot(row);
        const existing = await tx.nflPlayerEventStat.findUnique({ where: { participantId_eventId: { participantId: record.participantId, eventId: record.eventId } } });
        if (existing) {
          await tx.sportsStatRevision.create({ data: { kind: "PLAYER", playerStatId: existing.id, ingestionRunId: run.id, correctedById: actorId ?? null, previousValues: jsonValue(existingSnapshot(existing as unknown as Record<string, unknown>, "PLAYER")), newValues: jsonValue(facts), reason: payload.correctionReason } });
          await tx.nflPlayerEventStat.update({ where: { id: existing.id }, data: { participationStatus: row.participationStatus, ...Object.fromEntries(PLAYER_STAT_FIELDS.map((field) => [field, row[field] ?? null])), ...provenance } });
        } else {
          await tx.nflPlayerEventStat.create({ data: { participantId: record.participantId, eventId: record.eventId, participationStatus: row.participationStatus, ...Object.fromEntries(PLAYER_STAT_FIELDS.map((field) => [field, row[field] ?? null])), ...provenance } });
        }
      } else {
        const team = await tx.team.findUniqueOrThrow({ where: { league_abbreviation: { league: "NFL", abbreviation: row.teamAbbreviation } } });
        const facts = factualSnapshot(row);
        const existing = await tx.nflDefenseEventStat.findUnique({ where: { participantId_eventId: { participantId: record.participantId, eventId: record.eventId } } });
        if (existing) {
          await tx.sportsStatRevision.create({ data: { kind: "TEAM_DEFENSE", defenseStatId: existing.id, ingestionRunId: run.id, correctedById: actorId ?? null, previousValues: jsonValue(existingSnapshot(existing as unknown as Record<string, unknown>, "TEAM_DEFENSE")), newValues: jsonValue(facts), reason: payload.correctionReason } });
          await tx.nflDefenseEventStat.update({ where: { id: existing.id }, data: { ...facts, ...provenance, teamId: team.id } });
        } else {
          await tx.nflDefenseEventStat.create({ data: { participantId: record.participantId, eventId: record.eventId, teamId: team.id, ...facts, ...provenance } });
        }
      }
    }
    if (payload.coverage.finality === "FINAL") {
      const eventIds = [...new Set(run.records.map((record) => record.eventId).filter((id): id is string => Boolean(id)))];
      await tx.growthEvent.updateMany({
        where: { id: { in: eventIds }, status: { not: "CANCELLED" } },
        data: { status: "FINAL" },
      });
    }
    await tx.sportsIngestionRun.update({ where: { id: run.id }, data: { status: "APPLIED", appliedAt: new Date(), createdById: actorId ?? run.createdById } });
    await tx.auditEvent.create({ data: { actorId: actorId ?? null, action: payload.correctionReason ? "SPORTS_EVENT_STATS_CORRECTED" : "SPORTS_EVENT_STATS_APPLIED", entityType: "SportsIngestionRun", entityId: run.id, metadata: { checksum: run.checksum, sourceLabel: run.sourceLabel, rowCount: run.records.length, correctionReason: payload.correctionReason } } });
  }, { maxWait: 30_000, timeout: 600_000 });
  return prisma.sportsIngestionRun.findUniqueOrThrow({ where: { id: run.id }, include: { records: true } });
}
