import { Prisma, type SportsScoringRunMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fingerprint } from "./canonical-json";
import { competitionRank } from "./competition-rank";
import { adaptNflDefenseFacts, adaptNflPlayerFacts } from "./nfl-adapter";
import { scoreNflDefense, scoreNflPlayer } from "./nfl-engine";
import { NFL_HALF_PPR_SNG_V1, NFL_HALF_PPR_SNG_V1_CHECKSUM, NFL_POSITION_ELIGIBILITY_VERSION, NFL_SCORING_ENGINE_VERSION } from "./rules";

type SourceInput = {
  kind: "PLAYER" | "TEAM_DEFENSE"; sourceEntityType: string; sourceEntityId: string;
  participantId: string; eventId: string; ingestionRunId: string; revisionId: string | null;
  sourceFinality: "PROVISIONAL" | "FINAL" | "CORRECTED" | "VOID";
  positionCode: string; facts: Record<string, unknown>; revisionFingerprint: string;
};

export async function ensureDraftNflRuleset(client = prisma) {
  return client.sportsScoringRuleset.upsert({
    where: { code_version: { code: NFL_HALF_PPR_SNG_V1.code, version: NFL_HALF_PPR_SNG_V1.version } },
    update: {},
    create: {
      code: NFL_HALF_PPR_SNG_V1.code, version: NFL_HALF_PPR_SNG_V1.version,
      displayName: NFL_HALF_PPR_SNG_V1.displayName, sport: NFL_HALF_PPR_SNG_V1.sport,
      league: NFL_HALF_PPR_SNG_V1.league, status: "DRAFT",
      definition: NFL_HALF_PPR_SNG_V1 as unknown as Prisma.InputJsonValue,
      definitionChecksum: NFL_HALF_PPR_SNG_V1_CHECKSUM,
      engineFamily: "sng-nfl-fantasy-engine", minimumEngineVersion: NFL_SCORING_ENGINE_VERSION,
    },
  });
}

export async function calculateNflWeekPreview({ year, week, mode = "PREVIEW", createdById }: { year: number; week: number; mode?: SportsScoringRunMode; createdById?: string }) {
  if (mode === "PUBLISHED") throw new Error("Production publication is outside the Preview/Shadow workflow");
  const season = await prisma.sportsSeason.findUniqueOrThrow({ where: { league_year: { league: "NFL", year } } });
  const ruleset = await ensureDraftNflRuleset();
  if (ruleset.status === "ACTIVE") throw new Error("Preview workflow refuses an ACTIVE ruleset");

  const [playerStats, defenseStats] = await Promise.all([
    prisma.nflPlayerEventStat.findMany({
      where: { event: { league: "NFL", season: year, week }, finality: { in: ["FINAL", "CORRECTED"] } },
      include: { revisions: { orderBy: { createdAt: "desc" }, take: 1 }, participant: { include: { rosterMemberships: { where: { seasonId: season.id }, orderBy: { updatedAt: "desc" } } } } },
      orderBy: { id: "asc" },
    }),
    prisma.nflDefenseEventStat.findMany({
      where: { event: { league: "NFL", season: year, week }, finality: { in: ["FINAL", "CORRECTED"] } },
      include: { revisions: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { id: "asc" },
    }),
  ]);

  const playerFields = ["passingYards", "passingTouchdowns", "interceptionsThrown", "rushingYards", "rushingTouchdowns", "receptions", "receivingYards", "receivingTouchdowns", "twoPointConversions", "fumblesLost", "returnTouchdowns"] as const;
  const defenseFields = ["sacks", "defensiveInterceptions", "fumbleRecoveries", "defensiveTouchdowns", "specialTeamsTouchdowns", "safeties", "blockedKicks", "pointsAllowed"] as const;
  const inputs: SourceInput[] = [];
  for (const stat of playerStats) {
    const facts: Record<string, unknown> = Object.fromEntries(playerFields.map((field) => [field, stat[field]]));
    facts.participationStatus = stat.participationStatus;
    const membership = stat.participant.rosterMemberships[0];
    if (!membership) throw new Error(`No NFL ${year} roster membership for participant ${stat.participantId}`);
    const revisionId = stat.revisions[0]?.id ?? null;
    inputs.push({ kind: "PLAYER", sourceEntityType: "NflPlayerEventStat", sourceEntityId: stat.id, participantId: stat.participantId, eventId: stat.eventId, ingestionRunId: stat.ingestionRunId, revisionId, sourceFinality: stat.finality, positionCode: membership.fantasyPosition, facts, revisionFingerprint: fingerprint({ id: stat.id, revisionId, facts, finality: stat.finality }) });
  }
  for (const stat of defenseStats) {
    const facts = Object.fromEntries(defenseFields.map((field) => [field, stat[field]]));
    const revisionId = stat.revisions[0]?.id ?? null;
    inputs.push({ kind: "TEAM_DEFENSE", sourceEntityType: "NflDefenseEventStat", sourceEntityId: stat.id, participantId: stat.participantId, eventId: stat.eventId, ingestionRunId: stat.ingestionRunId, revisionId, sourceFinality: stat.finality, positionCode: "DEF", facts, revisionFingerprint: fingerprint({ id: stat.id, revisionId, facts, finality: stat.finality }) });
  }
  if (inputs.length === 0) throw new Error(`No final NFL ${year} Week ${week} factual inputs`);

  const prepared = inputs.map((input) => {
    const normalizedFacts = input.kind === "PLAYER" ? adaptNflPlayerFacts(input.facts) : adaptNflDefenseFacts(input.facts);
    const inputChecksum = fingerprint({ kind: input.kind, participantId: input.participantId, eventId: input.eventId, revisionFingerprint: input.revisionFingerprint, facts: normalizedFacts });
    const scored = input.kind === "PLAYER" ? scoreNflPlayer(normalizedFacts as ReturnType<typeof adaptNflPlayerFacts>) : scoreNflDefense(normalizedFacts as ReturnType<typeof adaptNflDefenseFacts>);
    const resultFingerprint = fingerprint({ inputChecksum, rulesetChecksum: NFL_HALF_PPR_SNG_V1_CHECKSUM, engineVersion: NFL_SCORING_ENGINE_VERSION, pointsHundredths: scored.pointsHundredths, components: scored.components });
    return { ...input, normalizedFacts, inputChecksum, scored, resultFingerprint };
  });
  const inputSetChecksum = fingerprint(prepared.map(({ inputChecksum }) => inputChecksum).sort());
  const runFingerprint = fingerprint({ sport: "FOOTBALL", league: "NFL", year, week, mode, rulesetChecksum: NFL_HALF_PPR_SNG_V1_CHECKSUM, engineVersion: NFL_SCORING_ENGINE_VERSION, inputSetChecksum });
  const replay = await prisma.sportsScoringRun.findUnique({ where: { runFingerprint }, include: { inputSnapshots: true, derivedPerformances: true, weeklyResultSets: { include: { entries: true } } } });
  if (replay) return { run: replay, replayed: true };

  return prisma.$transaction(async (tx) => {
    const run = await tx.sportsScoringRun.create({ data: {
      createdById, seasonId: season.id, rulesetId: ruleset.id, mode, status: "PENDING",
      sport: "FOOTBALL", league: "NFL", seasonYear: year, week,
      engineVersion: NFL_SCORING_ENGINE_VERSION, rulesetChecksum: NFL_HALF_PPR_SNG_V1_CHECKSUM,
      inputSetChecksum, runFingerprint, expectedInputCount: prepared.length,
    } });
    const derived: Array<{ id: string; participantId: string; positionCode: string; pointsHundredths: number }> = [];
    for (const item of prepared) {
      const snapshot = await tx.sportsScoringInputSnapshot.create({ data: {
        scoringRunId: run.id, participantId: item.participantId, eventId: item.eventId,
        performanceKind: item.kind, sourceEntityType: item.sourceEntityType, sourceEntityId: item.sourceEntityId,
        sourceIngestionRunId: item.ingestionRunId, sourceRevisionId: item.revisionId,
        sourceRevisionFingerprint: item.revisionFingerprint, sourceFinality: item.sourceFinality,
        normalizedFacts: item.normalizedFacts as unknown as Prisma.InputJsonValue, inputChecksum: item.inputChecksum,
      } });
      const prior = await tx.sportsDerivedPerformance.findFirst({ where: { participantId: item.participantId, eventId: item.eventId, rulesetId: ruleset.id, resultFingerprint: { not: item.resultFingerprint } }, orderBy: { calculatedAt: "desc" } });
      const performance = await tx.sportsDerivedPerformance.create({ data: {
        scoringRunId: run.id, inputSnapshotId: snapshot.id, participantId: item.participantId,
        eventId: item.eventId, rulesetId: ruleset.id, engineVersion: NFL_SCORING_ENGINE_VERSION,
        rulesetChecksum: NFL_HALF_PPR_SNG_V1_CHECKSUM, pointsHundredths: item.scored.pointsHundredths,
        fantasyPoints: new Prisma.Decimal(item.scored.fantasyPoints),
        componentBreakdown: item.scored.components as unknown as Prisma.InputJsonValue,
        finality: item.sourceFinality === "PROVISIONAL" ? "PROVISIONAL" : "FINAL",
        resultFingerprint: item.resultFingerprint, supersedesId: prior?.id,
      } });
      derived.push({ id: performance.id, participantId: item.participantId, positionCode: item.positionCode, pointsHundredths: item.scored.pointsHundredths });
    }
    let resultSetCount = 0;
    for (const positionCode of [...new Set(derived.map((item) => item.positionCode))].sort()) {
      const field = derived.filter((item) => item.positionCode === positionCode);
      const rankings = competitionRank(field.map((item) => ({ participantId: item.participantId, derivedPerformanceId: item.id, pointsHundredths: item.pointsHundredths })));
      const resultSetChecksum = fingerprint({ runFingerprint, positionCode, rankings });
      await tx.sportsWeeklyResultSet.create({ data: {
        scoringRunId: run.id, seasonId: season.id, rulesetId: ruleset.id, sport: "FOOTBALL", league: "NFL", seasonYear: year, week,
        positionCode, eligibilityPolicyVersion: NFL_POSITION_ELIGIBILITY_VERSION, inputSetChecksum, resultSetChecksum,
        finality: "FINAL", fieldSize: rankings.length, sourceComplete: true,
        entries: { create: rankings.map((entry) => ({
          participantId: entry.participantId, derivedPerformanceId: entry.derivedPerformanceId, positionCode,
          pointsHundredths: entry.pointsHundredths, fantasyPoints: new Prisma.Decimal(entry.fantasyPoints),
          competitionRank: entry.competitionRank, tieGroupKey: entry.tieGroupKey, tieGroupSize: entry.tieGroupSize,
          displayOrdinal: entry.displayOrdinal, fieldSize: entry.fieldSize,
          isTop3: entry.isTop3, isTop10: entry.isTop10, isTop15: entry.isTop15,
          eligibilityEvidence: { policyVersion: NFL_POSITION_ELIGIBILITY_VERSION, positionCode },
        })) },
      } });
      resultSetCount++;
    }
    const completed = await tx.sportsScoringRun.update({ where: { id: run.id }, data: {
      status: "COMPLETED", calculatedCount: derived.length, resultSetCount, completedAt: new Date(),
      summary: { playerInputs: playerStats.length, defenseInputs: defenseStats.length, positions: resultSetCount },
    }, include: { inputSnapshots: true, derivedPerformances: true, weeklyResultSets: { include: { entries: true } } } });
    return { run: completed, replayed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
