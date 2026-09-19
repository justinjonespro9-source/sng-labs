import { describe, expect, it } from "vitest";
import { normalizeParticipantName, resolveParticipantIdentity, type IdentityCandidate } from "./identity";

const player = (overrides: Partial<IdentityCandidate> = {}): IdentityCandidate => ({
  id: "p1",
  canonicalName: "Aaron Jones",
  kind: "PLAYER",
  aliases: ["Aaron Jones Sr."],
  externalIdentities: [{ provider: "rankeyeq-export", externalId: "aaron-jones" }],
  memberships: [{ league: "NFL", year: 2026, teamAbbreviation: "MIN", position: "RB" }],
  ...overrides,
});

describe("sports participant identity", () => {
  it("normalizes punctuation without treating a name as a unique identity", () => {
    expect(normalizeParticipantName("A.J. Brown")).toBe("a j brown");
  });

  it("prefers provider identity", () => {
    expect(resolveParticipantIdentity({ provider: "rankeyeq-export", externalId: "aaron-jones", name: "Other display", league: "NFL", year: 2026 }, [player()])).toMatchObject({ kind: "MATCHED", method: "EXTERNAL_ID" });
  });

  it("resolves a known alias to the canonical player", () => {
    expect(resolveParticipantIdentity({ name: "Aaron Jones Sr.", league: "NFL", year: 2026, teamAbbreviation: "MIN", position: "RB" }, [player()])).toMatchObject({ kind: "MATCHED", method: "ALIAS", candidate: { id: "p1" } });
  });

  it("blocks ambiguous aliases for operator review", () => {
    const result = resolveParticipantIdentity({ name: "Chris Jones", league: "NFL", year: 2026, position: "WR" }, [player({ id: "a", canonicalName: "Chris Jones", aliases: [] }), player({ id: "b", canonicalName: "Chris Jones", aliases: [] })]);
    expect(result).toMatchObject({ kind: "AMBIGUOUS", candidateIds: ["a", "b"] });
  });

  it("does not match a team defense to a human player", () => {
    expect(resolveParticipantIdentity({ name: "Minnesota Vikings D/ST", kind: "TEAM_DEFENSE", league: "NFL", year: 2026 }, [player({ canonicalName: "Minnesota Vikings D/ST" })])).toEqual({ kind: "CREATE" });
  });
});
