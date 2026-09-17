import { describe, expect, it } from "vitest";
import { evaluateEventRelevance, evaluateSlateRelevance, type RelevanceEvent } from "./relevance";

function event(overrides: Partial<RelevanceEvent> = {}): RelevanceEvent {
  return {
    id: "event-1",
    key: "nfl-2026-event-1",
    league: "NFL",
    season: 2026,
    week: 1,
    startsAt: new Date("2026-09-13T17:00:00.000Z"),
    status: "SCHEDULED",
    neutralSite: false,
    market: { id: "market-mn", name: "Minnesota / Twin Cities" },
    venue: { id: "venue-usb", key: "us-bank-stadium", name: "U.S. Bank Stadium", stadiumSlopVenueKey: "us-bank-stadium" },
    homeTeam: { id: "team-vikings", name: "Minnesota Vikings", brands: [] },
    awayTeam: { id: "team-packers", name: "Green Bay Packers" },
    activations: [],
    ...overrides,
  };
}

describe("game-day deterministic relevance", () => {
  it("creates Stadium Slop relevance only with matching strategic activation context", () => {
    const withoutActivation = evaluateEventRelevance(event());
    expect(withoutActivation).toMatchObject([{ brandKey: "stadium-slop", outcome: "NEEDS_CONTEXT", scope: "VENUE" }]);

    const activation = { id: "activation-1", campaignId: "campaign-1", teamId: "team-vikings", marketId: "market-mn", venueId: "venue-usb", venueName: "U.S. Bank Stadium", brands: [{ key: "stadium-slop" }], campaign: { id: "campaign-1", name: "NFL Stadium Food Rankings", status: "ACTIVE", brands: [{ key: "stadium-slop" }] } };
    const withActivation = evaluateEventRelevance(event({ activations: [activation] }));
    expect(withActivation).toMatchObject([{ brandKey: "stadium-slop", outcome: "CREATE_OPPORTUNITY", activationId: "activation-1", campaignId: "campaign-1", priority: "HIGH" }]);
  });

  it("does not assign a neutral-site game to the designated home market", () => {
    const activation = { id: "activation-1", campaignId: "campaign-1", teamId: "team-vikings", marketId: "market-mn", venueId: "venue-usb", venueName: "U.S. Bank Stadium", brands: [{ key: "stadium-slop" }], campaign: { id: "campaign-1", name: "Food", status: "ACTIVE", brands: [{ key: "stadium-slop" }] } };
    const results = evaluateEventRelevance(event({ neutralSite: true, activations: [activation] }));
    expect(results.find((item) => item.brandKey === "stadium-slop")?.outcome).toBe("NEEDS_CONTEXT");
    expect(results.some((item) => item.brandKey === "team-m8tes")).toBe(false);
  });

  it("keeps Team-M8tes local and explicitly contextual", () => {
    const teamRelevant = event({ homeTeam: { id: "team-vikings", name: "Minnesota Vikings", brands: [{ key: "team-m8tes" }] } });
    expect(evaluateEventRelevance(teamRelevant)).toContainEqual(expect.objectContaining({ brandKey: "team-m8tes", outcome: "NEEDS_CONTEXT", scope: "MARKET" }));
  });

  it("emits one slate decision per portfolio brand instead of per-game noise", () => {
    const decisions = evaluateSlateRelevance({ league: "NFL", season: 2026, week: 1, eventCount: 16, startsAt: new Date("2026-09-10T00:00:00.000Z") });
    expect(decisions).toHaveLength(5);
    expect(new Set(decisions.map((item) => item.brandKey)).size).toBe(5);
    expect(decisions.find((item) => item.brandKey === "rank-eye-q")).toMatchObject({ scope: "WEEK", outcome: "NEEDS_CONTEXT" });
    expect(decisions.find((item) => item.brandKey === "handicap-hero")).toMatchObject({ scope: "SLATE", outcome: "NEEDS_CONTEXT" });
    expect(decisions.find((item) => item.brandKey === "fantasytrack")).toMatchObject({ scope: "SLATE", outcome: "NEEDS_CONTEXT" });
    expect(decisions.find((item) => item.brandKey === "eyez-on-the-prize")?.outcome).toBe("SKIP");
    expect(decisions.find((item) => item.brandKey === "sng-labs")?.outcome).toBe("SKIP");
  });
});
