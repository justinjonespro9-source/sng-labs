import { describe, expect, it } from "vitest";
import { assessEventStatCoverage, buildCoverageAssertions } from "./stat-coverage";

const eventKey = "nfl-2026-week-1-atl-pit";
const facts = {
  passingYards: 0, passingTouchdowns: 0, interceptionsThrown: 0, rushingYards: 0,
  rushingTouchdowns: 0, receptions: 0, receivingYards: 0, receivingTouchdowns: 0,
  twoPointConversions: 0, fumblesLost: 0, returnTouchdowns: 0,
};
const defense = {
  sacks: 1, defensiveInterceptions: 0, fumbleRecoveries: 0, defensiveTouchdowns: 0,
  specialTeamsTouchdowns: 0, safeties: 0, blockedKicks: 0, pointsAllowed: 17,
};
const payload = (kind: "PLAYER" | "TEAM_DEFENSE", rows: unknown[]) => ({
  contractVersion: "sng-nfl-event-stats-v1", league: "NFL", year: 2026,
  sourceLabel: "test", sourceChecksum: `sha256:${"a".repeat(64)}`,
  coverage: {
    week: 1, kind, scope: kind === "PLAYER" ? "SOURCE_REPORTED_FANTASY_PARTICIPANTS" : "EXPLICIT_TEAM_DEFENSES",
    finality: "FINAL", sourceComplete: true, expectedEventCount: 1,
    expectedRowCount: rows.length, eventRowCounts: { [eventKey]: rows.length },
  }, rows,
});

describe("event stat coverage", () => {
  it("counts an explicit zero as complete participation, not missing data", () => {
    const players = [{ kind: "PLAYER", eventKey, provider: "test", externalId: "p1", canonicalName: "Player", teamAbbreviation: "ATL", finality: "FINAL", participationStatus: "PARTICIPATED_ZERO", ...facts }];
    const defenses = ["ATL", "PIT"].map((teamAbbreviation) => ({ kind: "TEAM_DEFENSE", eventKey, teamAbbreviation, finality: "FINAL", ...defense }));
    const assertions = buildCoverageAssertions([
      { status: "APPLIED", createdAt: new Date(1), rawPayload: JSON.stringify(payload("PLAYER", players)) },
      { status: "APPLIED", createdAt: new Date(2), rawPayload: JSON.stringify(payload("TEAM_DEFENSE", defenses)) },
    ]);
    const result = assessEventStatCoverage({ eventKey, playerStats: players, defenseStats: defenses, assertions });
    expect(result).toMatchObject({ complete: true, zeroStats: 1, unknownParticipation: 0 });
  });

  it("does not call rows complete without an applied source assertion", () => {
    const result = assessEventStatCoverage({ eventKey, playerStats: [], defenseStats: [], assertions: buildCoverageAssertions([]) });
    expect(result.complete).toBe(false);
    expect(result.reason).toContain("source-completeness");
  });
});
