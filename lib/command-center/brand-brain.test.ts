import { describe, expect, it } from "vitest";
import { contentModesToText, hasConfiguredBrandBrain, parseContentModes, parseLines, shouldInitializeBrandBrain, stadiumSlopBrandBrain, teamM8tesBrandBrain } from "./brand-brain";

describe("Brand Brain", () => {
  it("uses an explicit configuration state", () => {
    expect(hasConfiguredBrandBrain({ brandBrainVersion: null, brandBrainConfiguredAt: null })).toBe(false);
    expect(hasConfiguredBrandBrain({ brandBrainVersion: 1, brandBrainConfiguredAt: new Date() })).toBe(true);
  });

  it("initializes once and preserves later operator edits", () => {
    expect(shouldInitializeBrandBrain(null)).toBe(true);
    expect(shouldInitializeBrandBrain(1)).toBe(false);
  });

  it("normalizes structured line arrays", () => {
    expect(parseLines(" Fan-powered \n\n Discovery ")).toEqual(["Fan-powered", "Discovery"]);
  });

  it("round-trips editable content modes", () => {
    const modes = parseContentModes("Acquire | Get an attendee to participate | At the game? Rate what you ate.\nOutreach | Address distribution audiences");
    expect(contentModesToText(modes)).toBe("Acquire | Get an attendee to participate | At the game? Rate what you ate.\nOutreach | Address distribution audiences");
  });

  it("contains the canonical Stadium Slop strategy without fabricated results", () => {
    expect(stadiumSlopBrandBrain.contentPillars).toEqual(["Fan-powered", "Verified experience", "Discovery", "Competition", "Game-day culture"]);
    expect(stadiumSlopBrandBrain.factualRequirements).toContain("Never invent product activity to make content interesting");
    expect(stadiumSlopBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Acquire", "Engage", "Report", "Celebrate", "Challenge", "Explain", "Outreach"]);
  });

  it("keeps Team-M8tes dating-forward and connection-broad", () => {
    expect(teamM8tesBrandBrain.audience).toContain("Single sports fans");
    expect(teamM8tesBrandBrain.corePromise).toBe("The game is better with your person.");
    expect(teamM8tesBrandBrain.contentPillars).toEqual(["Shared Fandom", "Singles & Chemistry", "Game-Day Connection", "Compatibility Beyond a Photo", "Real-World Possibility"]);
    expect(teamM8tesBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Acquire", "Engage", "Game-Day", "Match / Connect", "Date Idea", "Culture / Humor", "Explain", "Outreach"]);
    expect(teamM8tesBrandBrain.aiOperatingInstructions).toContain("Do not sanitize dating language into vague community or networking language");
  });
});
