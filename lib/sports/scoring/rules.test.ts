import { describe, expect, it } from "vitest";
import { fingerprint } from "./canonical-json";
import { getScoringRuleset, NFL_HALF_PPR_SNG_V1, NFL_HALF_PPR_SNG_V1_CHECKSUM, NFL_SCORING_ENGINE_VERSION } from "./rules";

describe("ruleset registry", () => {
  it("has a stable content checksum", () => expect(NFL_HALF_PPR_SNG_V1_CHECKSUM).toBe(fingerprint(NFL_HALF_PPR_SNG_V1)));
  it("resolves the known immutable version", () => expect(getScoringRuleset("SNG_NFL_HALF_PPR", 1)).toBe(NFL_HALF_PPR_SNG_V1));
  it("fails closed for unknown identifiers", () => expect(() => getScoringRuleset("unknown", 1)).toThrow(/Unknown scoring ruleset/));
  it("pins the engine version", () => expect(NFL_SCORING_ENGINE_VERSION).toBe("sng-nfl-fantasy-engine/1.0.0"));
});
