import { describe, expect, it } from "vitest";
import { eventStatPayloadSchema } from "./stat-import-schema";

const playerRow = {
  kind: "PLAYER" as const,
  eventKey: "nfl-2026-week-1-min-gb",
  provider: "rankeyeq-export",
  externalId: "aaron-jones",
  canonicalName: "Aaron Jones",
  teamAbbreviation: "MIN",
  finality: "FINAL" as const,
  rushingYards: 63,
  receptions: 4,
};

const payload = (rows: unknown[]) => ({
  contractVersion: "sng-nfl-event-stats-v1",
  league: "NFL",
  year: 2026,
  sourceLabel: "Official gamebook",
  rows,
});

describe("NFL event-stat import contract", () => {
  it("accepts explicit zero and preserves unknown as omitted", () => {
    const parsed = eventStatPayloadSchema.parse(payload([{ ...playerRow, fumblesLost: 0 }]));
    expect(parsed.rows[0]).toMatchObject({ fumblesLost: 0, rushingYards: 63 });
    expect("passingYards" in parsed.rows[0]).toBe(false);
  });

  it("allows negative yardage but rejects impossible negative counts", () => {
    expect(eventStatPayloadSchema.safeParse(payload([{ ...playerRow, rushingYards: -4 }])).success).toBe(true);
    expect(eventStatPayloadSchema.safeParse(payload([{ ...playerRow, receptions: -1 }])).success).toBe(false);
  });

  it("rejects duplicate performance identities", () => {
    expect(eventStatPayloadSchema.safeParse(payload([playerRow, playerRow])).success).toBe(false);
  });

  it("requires separate player and defense imports", () => {
    const defense = { kind: "TEAM_DEFENSE", eventKey: playerRow.eventKey, teamAbbreviation: "MIN", pointsAllowed: 17 };
    expect(eventStatPayloadSchema.safeParse(payload([playerRow, defense])).success).toBe(false);
  });

  it("accepts explicit pointsAllowed as a sourced DEF fact", () => {
    const defense = { kind: "TEAM_DEFENSE", eventKey: playerRow.eventKey, teamAbbreviation: "MIN", pointsAllowed: 17 };
    expect(eventStatPayloadSchema.parse(payload([defense])).rows[0]).toMatchObject({ pointsAllowed: 17 });
  });
});
