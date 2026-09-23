import { describe, expect, it } from "vitest";
import { scoreNflDefense, scoreNflPlayer } from "./nfl-engine";
import type { NflDefenseFacts, NflPlayerFacts } from "./types";

const player = (overrides: Partial<NflPlayerFacts> = {}): NflPlayerFacts => ({
  participationStatus: "PARTICIPATED_WITH_STATS", passingYards: 0, passingTouchdowns: 0,
  interceptionsThrown: 0, rushingYards: 0, rushingTouchdowns: 0, receptions: 0,
  receivingYards: 0, receivingTouchdowns: 0, twoPointConversions: 0, fumblesLost: 0,
  returnTouchdowns: 0, ...overrides,
});
const defense = (overrides: Partial<NflDefenseFacts> = {}): NflDefenseFacts => ({
  sacks: 0, defensiveInterceptions: 0, fumbleRecoveries: 0, defensiveTouchdowns: 0,
  specialTeamsTouchdowns: 0, safeties: 0, blockedKicks: 0, pointsAllowed: 21, ...overrides,
});

describe("NFL Half-PPR — SNG V1 player scoring", () => {
  it.each([
    ["passingYards", 25, 100], ["passingTouchdowns", 1, 400], ["interceptionsThrown", 1, -200],
    ["rushingYards", 10, 100], ["rushingTouchdowns", 1, 600], ["receptions", 2, 100],
    ["receivingYards", 10, 100], ["receivingTouchdowns", 1, 600], ["twoPointConversions", 1, 200],
    ["fumblesLost", 1, -200], ["returnTouchdowns", 1, 600],
  ] as const)("scores %s", (field, quantity, expected) => {
    expect(scoreNflPlayer(player({ [field]: quantity })).pointsHundredths).toBe(expected);
  });

  it.each([[299, 1196], [300, 1700], [301, 1704]] as const)("applies passing bonus boundary %i", (yards, expected) => expect(scoreNflPlayer(player({ passingYards: yards })).pointsHundredths).toBe(expected));
  it.each([[99, 990], [100, 1500], [101, 1510]] as const)("applies rushing bonus boundary %i", (yards, expected) => expect(scoreNflPlayer(player({ rushingYards: yards })).pointsHundredths).toBe(expected));
  it.each([[99, 990], [100, 1500], [101, 1510]] as const)("applies receiving bonus boundary %i", (yards, expected) => expect(scoreNflPlayer(player({ receivingYards: yards })).pointsHundredths).toBe(expected));
  it("stacks every yardage bonus", () => expect(scoreNflPlayer(player({ passingYards: 300, rushingYards: 100, receivingYards: 100 })).pointsHundredths).toBe(4700));
  it("preserves negative scores", () => expect(scoreNflPlayer(player({ interceptionsThrown: 3, fumblesLost: 2 })).pointsHundredths).toBe(-1000));
  it("scores explicit zero participation", () => expect(scoreNflPlayer(player({ participationStatus: "PARTICIPATED_ZERO" })).pointsHundredths).toBe(0));
  it.each(["UNKNOWN", "DID_NOT_PARTICIPATE"] as const)("fails closed for %s", (participationStatus) => expect(() => scoreNflPlayer(player({ participationStatus }))).toThrow(/Unscorable/));
  it("rejects incomplete facts", () => expect(() => scoreNflPlayer({ ...player(), receptions: null } as unknown as NflPlayerFacts)).toThrow(/Incomplete/));
  it("uses exact integer hundredths", () => expect(scoreNflPlayer(player({ passingYards: 1, receptions: 1 })).pointsHundredths).toBe(54));
});

describe("NFL Half-PPR — SNG V1 D/ST scoring", () => {
  it.each([[0, 1000], [1, 700], [6, 700], [7, 400], [13, 400], [14, 100], [20, 100], [21, 0], [27, 0], [28, -100], [34, -100], [35, -400], [70, -400]] as const)("scores pointsAllowed %i", (pointsAllowed, expected) => expect(scoreNflDefense(defense({ pointsAllowed })).pointsHundredths).toBe(expected));
  it("scores all defensive components", () => expect(scoreNflDefense(defense({ sacks: 1, defensiveInterceptions: 1, fumbleRecoveries: 1, defensiveTouchdowns: 1, specialTeamsTouchdowns: 1, safeties: 1, blockedKicks: 1 })).pointsHundredths).toBe(2100));
  it("rejects negative pointsAllowed", () => expect(() => scoreNflDefense(defense({ pointsAllowed: -1 }))).toThrow(/cannot be negative/));
  it("rejects missing pointsAllowed", () => expect(() => scoreNflDefense({ ...defense(), pointsAllowed: null } as unknown as NflDefenseFacts)).toThrow(/Incomplete/));
});
