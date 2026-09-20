import { describe, expect, it } from "vitest";
import { classifyFactChange, eventIncludesTeam, participantHasSeasonTeam } from "./stat-planning";

describe("event-stat planning", () => {
  it("uses one canonical participant/event performance boundary", () => {
    expect(classifyFactChange({ incomingFacts: { rushingYards: 42 }, incomingFinality: "PROVISIONAL" })).toBe("CREATE");
    expect(classifyFactChange({ existingFacts: { rushingYards: 42 }, incomingFacts: { rushingYards: 42 }, existingFinality: "FINAL", incomingFinality: "FINAL" })).toBe("UNCHANGED");
  });

  it("blocks conflicting facts until they are submitted as a correction", () => {
    const base = { existingFacts: { rushingYards: 42 }, incomingFacts: { rushingYards: 43 }, existingFinality: "FINAL", incomingFinality: "FINAL" };
    expect(classifyFactChange(base)).toBe("CONFLICT");
    expect(classifyFactChange({ ...base, correctionReason: "Official stat correction" })).toBe("UPDATE");
  });

  it("validates event and season-team membership independently", () => {
    expect(eventIncludesTeam({ homeTeamId: "min", awayTeamId: "gb" }, "min")).toBe(true);
    expect(eventIncludesTeam({ homeTeamId: "min", awayTeamId: "gb" }, "chi")).toBe(false);
    expect(participantHasSeasonTeam([{ league: "NFL", year: 2026, teamAbbreviation: "MIN" }], "MIN")).toBe(true);
    expect(participantHasSeasonTeam([{ league: "NFL", year: 2026, teamAbbreviation: "MIN" }], "GB")).toBe(false);
  });
});
