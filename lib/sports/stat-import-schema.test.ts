import { describe, expect, it } from "vitest";
import { eventStatPayloadSchema } from "./stat-import-schema";

const eventKey = "nfl-2026-week-1-min-gb";
const zeroPlayerFacts = {
  passingYards: 0,
  passingTouchdowns: 0,
  interceptionsThrown: 0,
  rushingYards: 0,
  rushingTouchdowns: 0,
  receptions: 0,
  receivingYards: 0,
  receivingTouchdowns: 0,
  twoPointConversions: 0,
  fumblesLost: 0,
  returnTouchdowns: 0,
};

const playerRow = {
  kind: "PLAYER" as const,
  eventKey,
  provider: "nflverse-gsis",
  externalId: "aaron-jones",
  canonicalName: "Aaron Jones",
  teamAbbreviation: "MIN",
  participationStatus: "PARTICIPATED_WITH_STATS" as const,
  finality: "FINAL" as const,
  ...zeroPlayerFacts,
  rushingYards: 63,
  receptions: 4,
};

const defenseRow = {
  kind: "TEAM_DEFENSE" as const,
  eventKey,
  teamAbbreviation: "MIN",
  finality: "FINAL" as const,
  sacks: 2,
  defensiveInterceptions: 1,
  fumbleRecoveries: 0,
  defensiveTouchdowns: 0,
  specialTeamsTouchdowns: 0,
  safeties: 0,
  blockedKicks: 0,
  pointsAllowed: 17,
};

const payload = (rows: Array<Record<string, unknown>>) => {
  const counts = rows.reduce<Record<string, number>>((result, row) => {
    const eventKey = String(row.eventKey);
    result[eventKey] = (result[eventKey] ?? 0) + 1;
    return result;
  }, {});
  const kind = String(rows[0].kind);
  return {
    contractVersion: "sng-nfl-event-stats-v1",
    league: "NFL",
    year: 2026,
    sourceLabel: "Operator-controlled source",
    sourceChecksum: `sha256:${"a".repeat(64)}`,
    coverage: {
      week: 1,
      kind,
      scope: kind === "PLAYER" ? "SOURCE_REPORTED_FANTASY_PARTICIPANTS" : "EXPLICIT_TEAM_DEFENSES",
      finality: "FINAL",
      sourceComplete: true,
      expectedEventCount: Object.keys(counts).length,
      expectedRowCount: rows.length,
      eventRowCounts: counts,
    },
    rows,
  };
};

describe("NFL event-stat import contract", () => {
  it("accepts complete source-reported player facts with explicit zeroes", () => {
    const parsed = eventStatPayloadSchema.parse(payload([playerRow]));
    expect(parsed.rows[0]).toMatchObject({ fumblesLost: 0, rushingYards: 63, participationStatus: "PARTICIPATED_WITH_STATS" });
  });

  it("distinguishes a legitimate all-zero participant from missing data", () => {
    const zero = { ...playerRow, participationStatus: "PARTICIPATED_ZERO" as const, ...zeroPlayerFacts };
    expect(eventStatPayloadSchema.safeParse(payload([zero])).success).toBe(true);
    expect(eventStatPayloadSchema.safeParse(payload([{ ...zero, participationStatus: "PARTICIPATED_WITH_STATS" as const }])).success).toBe(false);
    expect(eventStatPayloadSchema.safeParse(payload([{ ...playerRow, passingYards: undefined }])).success).toBe(false);
  });

  it("allows negative yardage but rejects impossible negative counts", () => {
    expect(eventStatPayloadSchema.safeParse(payload([{ ...playerRow, rushingYards: -4 }])).success).toBe(true);
    expect(eventStatPayloadSchema.safeParse(payload([{ ...playerRow, receptions: -1 }])).success).toBe(false);
  });

  it("rejects duplicate performance identities", () => {
    expect(eventStatPayloadSchema.safeParse(payload([playerRow, playerRow])).success).toBe(false);
  });

  it("requires separate player and defense imports", () => {
    expect(eventStatPayloadSchema.safeParse(payload([playerRow, defenseRow])).success).toBe(false);
  });

  it("accepts explicit pointsAllowed and complete sourced DEF facts", () => {
    expect(eventStatPayloadSchema.parse(payload([defenseRow])).rows[0]).toMatchObject({ pointsAllowed: 17 });
    expect(eventStatPayloadSchema.safeParse(payload([{ ...defenseRow, pointsAllowed: undefined }])).success).toBe(false);
  });

  it("rejects coverage assertions that do not match payload contents", () => {
    const invalid = payload([playerRow]);
    invalid.coverage.expectedRowCount = 2;
    expect(eventStatPayloadSchema.safeParse(invalid).success).toBe(false);
  });
});
