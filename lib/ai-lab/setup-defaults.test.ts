import { describe, expect, it } from "vitest";
import { resolveAiLabSetupDefaults } from "./setup-defaults";

describe("AI Lab setup defaults", () => {
  const opportunity = {
    id: "opportunity-1",
    eventId: "event-vikings-dolphins",
    activation: {
      id: "activation-vikings",
      campaign: { id: "campaign-stadium-food", programId: "program-fan-game-day" },
    },
    campaigns: [
      { campaign: { id: "campaign-stadium-food", programId: "program-fan-game-day" } },
    ],
  };

  it("inherits the canonical program, campaign, activation, and event from an Opportunity", () => {
    expect(resolveAiLabSetupDefaults({
      brandId: "brand-stadium-slop",
      opportunityId: opportunity.id,
      opportunities: [opportunity],
    })).toEqual({
      brandId: "brand-stadium-slop",
      opportunityId: opportunity.id,
      eventId: "event-vikings-dolphins",
      activationId: "activation-vikings",
      campaignId: "campaign-stadium-food",
      growthProgramId: "program-fan-game-day",
    });
  });

  it("prefers explicit setup selections without duplicating strategic relationships", () => {
    expect(resolveAiLabSetupDefaults({
      opportunityId: opportunity.id,
      eventId: "event-explicit",
      activationId: "activation-explicit",
      campaignId: "campaign-explicit",
      growthProgramId: "program-explicit",
      opportunities: [opportunity],
    })).toMatchObject({
      eventId: "event-explicit",
      activationId: "activation-explicit",
      campaignId: "campaign-explicit",
      growthProgramId: "program-explicit",
    });
  });

  it("falls back to the existing Campaign junction when no Activation is linked", () => {
    expect(resolveAiLabSetupDefaults({
      opportunityId: "opportunity-2",
      opportunities: [{
        id: "opportunity-2",
        eventId: "event-2",
        activation: null,
        campaigns: [{ campaign: { id: "campaign-2", programId: "program-2" } }],
      }],
    })).toMatchObject({ campaignId: "campaign-2", growthProgramId: "program-2" });
  });
});
