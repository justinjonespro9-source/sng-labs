import { describe, expect, it } from "vitest";
import { mergeActivationContext } from "./campaign-workflow";

describe("campaign activation context", () => {
  it("carries campaign, market, and team into an Opportunity without duplicates", () => {
    expect(mergeActivationContext({ campaignIds: ["campaign-1"], marketIds: [], teamIds: ["team-1"] }, { campaignId: "campaign-1", marketId: "market-1", teamId: "team-1" })).toEqual({ campaignIds: ["campaign-1"], marketIds: ["market-1"], teamIds: ["team-1"] });
  });

  it("preserves explicitly selected context for non-geographic activations", () => {
    expect(mergeActivationContext({ campaignIds: ["other"], marketIds: ["market"], teamIds: [] }, { campaignId: "skill", marketId: null, teamId: null })).toEqual({ campaignIds: ["other", "skill"], marketIds: ["market"], teamIds: [] });
  });
});
