import { describe, expect, it } from "vitest";
import { evaluateSportsWindow, registeredSportsIntelligenceLeagues } from "./evaluation";

describe("Sports Intelligence evaluator registry", () => {
  it("preserves NFL as the only activated deterministic evaluator", () => {
    expect(registeredSportsIntelligenceLeagues()).toEqual(["NFL"]);
  });

  it("fails closed for leagues without approved relevance rules", async () => {
    await expect(evaluateSportsWindow({} as never, { leagueCode: "NBA", seasonYear: 2026 })).rejects.toThrow("No approved Sports Intelligence evaluator");
  });
});
