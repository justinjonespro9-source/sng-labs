import { describe, expect, it } from "vitest";
import { checksumImport, normalizeNflTeamAbbreviation, rosterPayloadSchema, SNG_ROSTER_EXPORT_VERSION } from "./import-schema";

describe("sports roster import contract", () => {
  it("accepts NFL 2026 and rejects unsupported years", () => {
    const base = { league: "NFL", year: 2026, sourceLabel: "operator", rows: [{ provider: "manual", externalId: "p1", canonicalName: "Player One", teamAbbreviation: "MIN", fantasyPosition: "RB" }] };
    expect(rosterPayloadSchema.safeParse(base).success).toBe(true);
    expect(rosterPayloadSchema.safeParse({ ...base, year: 2025 }).success).toBe(false);
  });

  it("produces stable checksums for identical replay", () => {
    const raw = JSON.stringify({ hello: "world" });
    expect(checksumImport(raw)).toBe(checksumImport(raw));
    expect(checksumImport(raw)).not.toBe(checksumImport(`${raw} `));
    expect(checksumImport(raw, "parser-v1")).not.toBe(checksumImport(raw, "parser-v2"));
  });

  it("normalizes known source abbreviations to the canonical SNG team identity", () => {
    expect(normalizeNflTeamAbbreviation("WAS")).toBe("WSH");
    expect(normalizeNflTeamAbbreviation(" min ")).toBe("MIN");

    const parsed = rosterPayloadSchema.parse({
      league: "NFL",
      year: 2026,
      sourceLabel: "RankEyeQ export",
      rows: [{ provider: "nflcom-bootstrap", externalId: "player-1", canonicalName: "Player One", teamAbbreviation: "WAS", fantasyPosition: "QB" }],
    });
    expect(parsed.rows[0].teamAbbreviation).toBe("WSH");
  });

  it("rejects duplicate provider identities within one payload", () => {
    const row = { provider: "nflcom-bootstrap", externalId: "player-1", canonicalName: "Player One", teamAbbreviation: "MIN", fantasyPosition: "RB" };
    const result = rosterPayloadSchema.safeParse({ league: "NFL", year: 2026, sourceLabel: "operator", rows: [row, { ...row, teamAbbreviation: "PHI" }] });
    expect(result.success).toBe(false);
  });

  it("requires all 32 teams for the versioned RankEyeQ league export", () => {
    const result = rosterPayloadSchema.safeParse({
      contractVersion: SNG_ROSTER_EXPORT_VERSION,
      league: "NFL",
      year: 2026,
      sourceLabel: "RankEyeQ export",
      exportedAt: "2026-09-19T00:00:00.000Z",
      rows: [{ provider: "nflcom-bootstrap", externalId: "player-1", canonicalName: "Player One", teamAbbreviation: "MIN", fantasyPosition: "RB" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a unique, versioned 32-team league export", () => {
    const teams = Array.from({ length: 32 }, (_, index) => `T${String(index).padStart(2, "0")}`);
    const result = rosterPayloadSchema.safeParse({
      contractVersion: SNG_ROSTER_EXPORT_VERSION,
      league: "NFL",
      year: 2026,
      sourceLabel: "RankEyeQ export",
      sourceReference: "rankeyeq://season/2026",
      sourceSyncedAt: "2026-09-18T00:00:00.000Z",
      exportedAt: "2026-09-19T00:00:00.000Z",
      rows: teams.map((team, index) => ({
        provider: "nflcom-bootstrap",
        externalId: `player-${index}`,
        canonicalName: `Player ${index}`,
        teamAbbreviation: team,
        fantasyPosition: "RB",
      })),
    });
    expect(result.success).toBe(true);
  });
});
