import { describe, expect, it } from "vitest";
import { contentModesToText, eyezOnThePrizeBrandBrain, fantasyTrackBrandBrain, handicapHeroBrandBrain, hasConfiguredBrandBrain, parseContentModes, parseLines, rankEyeQBrandBrain, shouldInitializeBrandBrain, sngLabsBrandBrain, stadiumSlopBrandBrain, teamM8tesBrandBrain } from "./brand-brain";

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

  it("keeps SNG LABS above the portfolio and allows Do Not Post", () => {
    expect(sngLabsBrandBrain.corePromise).toBe("Transforming Fans from Spectators into Participants.");
    expect(sngLabsBrandBrain.coreProposition).toContain("sports-tech product studio");
    expect(sngLabsBrandBrain.contentPillars).toEqual(["From Spectator to Participant", "Build New Ways to Play", "Product Thesis", "Founder / Builder", "Portfolio / Lab", "Partnerships / What Could This Become?"]);
    expect(sngLabsBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Company / Portfolio", "Product Thesis", "Founder / Builder", "Build in Public", "Milestone", "Partnership", "Industry / Category", "Media / Press", "Investor / Strategic", "Outreach", "Do Not Post"]);
    expect(sngLabsBrandBrain.aiOperatingInstructions).toContain("Never automatically create SNG content because a product has an opportunity");
    expect(sngLabsBrandBrain.aiOperatingInstructions).toContain("Remember: SNG LABS does not narrate the portfolio. It tells the story behind the portfolio.");
    expect(sngLabsBrandBrain.prohibitedContent).toContain("Automatic reposting or rewriting of routine product content");
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

  it("keeps RankEyeQ competition first and intelligence second", () => {
    expect(rankEyeQBrandBrain.corePromise).toBe("Prove you know ball.");
    expect(rankEyeQBrandBrain.coreProposition).toContain("Everybody has rankings. RankEyeQ keeps score.");
    expect(rankEyeQBrandBrain.contentPillars).toEqual(["Prove It", "Rank the Field", "Receipts", "Humans vs Experts vs AI", "Reputation"]);
    expect(rankEyeQBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Acquire", "Rank", "Challenge", "Results / Receipts", "Compare", "Report / Insight", "Reputation / Celebrate", "Outreach"]);
    expect(rankEyeQBrandBrain.aiOperatingInstructions).toContain("Distinguish submitted predictions, consensus, and actual results");
    expect(rankEyeQBrandBrain.prohibitedContent.some((rule) => rule.includes("sportsbook"))).toBe(true);
  });

  it("keeps Handicap Hero centered on confidence ordering and survival", () => {
    expect(handicapHeroBrandBrain.corePromise).toBe("How deep can you go?");
    expect(handicapHeroBrandBrain.coreProposition).toContain("Ordering is the game. Survival is the drama.");
    expect(handicapHeroBrandBrain.coreProposition).toContain("Your picks aren't the challenge. Your confidence is.");
    expect(handicapHeroBrandBrain.contentPillars).toEqual(["Rank Your Conviction", "Survive the Card", "The Order Matters", "Beat the Bots", "Perfect 8", "Receipts / Reputation"]);
    expect(handicapHeroBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Acquire", "Build the Card", "Lock / Last Call", "Live Survival", "Results / Receipts", "Beat the Bots", "Perfect 8", "Streaks / Reputation", "Explain", "Outreach"]);
    expect(handicapHeroBrandBrain.aiOperatingInstructions).toContain("Treat confidence ordering as the defining mechanic");
    expect(handicapHeroBrandBrain.aiOperatingInstructions).toContain("Treat survival as the emotional engine");
    expect(handicapHeroBrandBrain.prohibitedContent.some((rule) => rule.includes("Fabricated contests"))).toBe(true);
  });

  it("separates FantasyTrack's consumer race from its B2B pricing thesis", () => {
    expect(fantasyTrackBrandBrain.corePromise).toBe("Every player. One race. Who finishes first?");
    expect(fantasyTrackBrandBrain.coreProposition).toContain("The players are the field. The game is the race.");
    expect(fantasyTrackBrandBrain.contentPillars).toEqual(["The Position Race", "Player vs Player", "Live Race", "Long Shots / Breakouts", "Public Conviction", "The Field Prices Itself"]);
    expect(fantasyTrackBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Acquire", "Pick Your Runner", "Pre-Race", "Live Race", "Results", "Long Shot / Breakout", "Public Conviction", "Industry / B2B", "Outreach"]);
    expect(fantasyTrackBrandBrain.aiOperatingInstructions).toContain("Distinguish the simple consumer race story from the B2B self-pricing-field story");
    expect(fantasyTrackBrandBrain.prohibitedContent.some((rule) => rule.includes("Promises of profit"))).toBe(true);
  });

  it("separates Eyez consumer simplicity from its commercial attention thesis", () => {
    expect(eyezOnThePrizeBrandBrain.corePromise).toBe("Your Attention Is Worth Something.");
    expect(eyezOnThePrizeBrandBrain.coreProposition).toContain("Watch → Entry → Drawing → Winner");
    expect(eyezOnThePrizeBrandBrain.coreProposition).toContain("attention can become a transparent value exchange");
    expect(eyezOnThePrizeBrandBrain.contentPillars).toEqual(["Attention Has Value", "Clear Exchange", "Verified Participation", "Transparent Outcome", "Prizes Worth Paying Attention To", "Attention → Participation"]);
    expect(eyezOnThePrizeBrandBrain.contentModes.map((mode) => mode.name)).toEqual(["Acquire", "Explain", "Campaign / Prize", "Countdown / Scarcity", "Completion / Entry", "Drawing", "Winner / Proof", "Sponsor Story", "Industry / B2B", "Outreach"]);
    expect(eyezOnThePrizeBrandBrain.aiOperatingInstructions).toContain("Keep consumer mechanics extremely simple: Watch → Entry → Drawing → Winner");
    expect(eyezOnThePrizeBrandBrain.prohibitedContent.some((rule) => rule.includes("Fabricated sponsors"))).toBe(true);
  });
});

