import { DEFENSE_STAT_FIELDS, eventStatPayloadSchema, PLAYER_STAT_FIELDS } from "./stat-import-schema";

type PlayerFact = Record<string, unknown> & { participationStatus?: string };
type DefenseFact = Record<string, unknown>;

export type EventStatCoverage = {
  complete: boolean;
  playerCoverageDeclared: boolean;
  defenseCoverageDeclared: boolean;
  expectedPlayerRows: number | null;
  expectedDefenseRows: number | null;
  playerRows: number;
  defenseRows: number;
  withStats: number;
  zeroStats: number;
  didNotParticipate: number;
  unknownParticipation: number;
  reason: string;
};

export function buildCoverageAssertions(runs: Array<{ status: string; rawPayload: string; createdAt: Date }>) {
  const player = new Map<string, { expected: number; createdAt: Date }>();
  const defense = new Map<string, { expected: number; createdAt: Date }>();
  for (const run of runs.filter((candidate) => candidate.status === "APPLIED").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    let raw: unknown;
    try {
      raw = JSON.parse(run.rawPayload);
    } catch {
      continue;
    }
    const parsed = eventStatPayloadSchema.safeParse(raw);
    if (!parsed.success) continue;
    const target = parsed.data.coverage.kind === "PLAYER" ? player : defense;
    for (const [eventKey, expected] of Object.entries(parsed.data.coverage.eventRowCounts)) {
      target.set(eventKey, { expected, createdAt: run.createdAt });
    }
  }
  return { player, defense };
}

export function assessEventStatCoverage(input: {
  eventKey: string;
  playerStats: PlayerFact[];
  defenseStats: DefenseFact[];
  assertions: ReturnType<typeof buildCoverageAssertions>;
}): EventStatCoverage {
  const playerAssertion = input.assertions.player.get(input.eventKey);
  const defenseAssertion = input.assertions.defense.get(input.eventKey);
  const withStats = input.playerStats.filter((row) => row.participationStatus === "PARTICIPATED_WITH_STATS").length;
  const zeroStats = input.playerStats.filter((row) => row.participationStatus === "PARTICIPATED_ZERO").length;
  const didNotParticipate = input.playerStats.filter((row) => row.participationStatus === "DID_NOT_PARTICIPATE").length;
  const unknownParticipation = input.playerStats.filter((row) => !row.participationStatus || row.participationStatus === "UNKNOWN").length;
  const playerFactsComplete = input.playerStats.every((row) => {
    if (row.participationStatus === "DID_NOT_PARTICIPATE") return PLAYER_STAT_FIELDS.every((field) => row[field] == null);
    return ["PARTICIPATED_WITH_STATS", "PARTICIPATED_ZERO"].includes(String(row.participationStatus))
      && PLAYER_STAT_FIELDS.every((field) => typeof row[field] === "number");
  });
  const defenseFactsComplete = input.defenseStats.every((row) => DEFENSE_STAT_FIELDS.every((field) => typeof row[field] === "number"));
  const playerCountMatches = playerAssertion?.expected === input.playerStats.length;
  const defenseCountMatches = defenseAssertion?.expected === input.defenseStats.length && input.defenseStats.length === 2;
  const complete = Boolean(playerAssertion && defenseAssertion && playerCountMatches && defenseCountMatches && playerFactsComplete && defenseFactsComplete && unknownParticipation === 0);
  const reason = complete
    ? "Source-declared player participation and both explicit D/ST performances are complete"
    : !playerAssertion || !defenseAssertion
      ? "Missing an applied source-completeness assertion"
      : !playerCountMatches || !defenseCountMatches
        ? "Stored performance counts do not match the applied source assertion"
        : unknownParticipation > 0
          ? "One or more player participation states are unknown"
          : "One or more required factual values are missing";
  return {
    complete,
    playerCoverageDeclared: Boolean(playerAssertion),
    defenseCoverageDeclared: Boolean(defenseAssertion),
    expectedPlayerRows: playerAssertion?.expected ?? null,
    expectedDefenseRows: defenseAssertion?.expected ?? null,
    playerRows: input.playerStats.length,
    defenseRows: input.defenseStats.length,
    withStats,
    zeroStats,
    didNotParticipate,
    unknownParticipation,
    reason,
  };
}
