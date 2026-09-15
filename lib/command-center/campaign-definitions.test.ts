import { describe, expect, it } from "vitest";
import { campaignDefinitions, growthProgramDefinitions } from "./campaign-definitions";

describe("canonical growth programs and campaigns", () => {
  it("defines the two operating systems without forcing one program per brand", () => {
    expect(growthProgramDefinitions.map((program) => program.key)).toEqual(["fan-game-day-experience", "skill-and-prediction"]);
    expect(new Set(growthProgramDefinitions.flatMap((program) => program.brandKeys)).size).toBe(6);
  });

  it("uses activations rather than one campaign per NFL team", () => {
    expect(campaignDefinitions).toHaveLength(11);
    expect(campaignDefinitions.filter(([key]) => key === "nfl-stadium-food-rankings")).toHaveLength(1);
    expect(campaignDefinitions.some(([key]) => key.includes("vikings"))).toBe(false);
  });
});
