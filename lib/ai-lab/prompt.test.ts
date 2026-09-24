import { describe, expect, it } from "vitest";
import { buildGenerationInput } from "./prompt";

describe("AI Lab canonical event context", () => {
  it("serializes the resolved GrowthEvent into trusted execution context", () => {
    const context = {
      brand: { id: "brand-1", key: "stadium-slop", name: "Stadium Slop" },
      brandBrain: { factualRequirements: ["Use only verified event context"] },
      growthProgram: null,
      campaign: null,
      activation: null,
      event: { id: "event-1", key: "nba-2026-min-tor", name: "Toronto Raptors at Minnesota Timberwolves", startsAt: "2026-10-25T23:00:00.000Z", status: "SCHEDULED" },
      opportunity: null,
      audience: null,
      relationship: null,
      channel: "X",
      trust: { absentContext: "Anything not listed below is absent and must not be invented" },
      operatorContext: null,
    };
    const prompt = buildGenerationInput(context as never);
    expect(prompt).toContain('"event"');
    expect(prompt).toContain('"id": "event-1"');
    expect(prompt).toContain("Anything not listed below is absent and must not be invented");
  });

  it("represents a missing event as null instead of inventing one", () => {
    const prompt = buildGenerationInput({ brand: {}, brandBrain: {}, growthProgram: null, campaign: null, activation: null, event: null, opportunity: null, audience: null, relationship: null, channel: "X", trust: {}, operatorContext: null } as never);
    expect(prompt).toContain('"event": null');
  });
});
