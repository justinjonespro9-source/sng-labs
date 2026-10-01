import { describe, expect, it } from "vitest";
import { activeCampaignGaps, assertActiveCampaignContract, changedMaterialFields, formatMinor, isValidDestinationUrl, parseMoneyToMinor, parseNonNegativeInteger, requiresActiveContract, type CampaignContractInput, type MaterialSnapshot } from "./campaign-contract";

const complete: CampaignContractInput = {
  ownerId: "user_1",
  brandIds: ["brand_rank"],
  objective: "Get 40 Minnesota fans to finish a RankEyeQ ranking",
  primaryAudience: "Vikings fans on Discord",
  offer: "Weekly leaderboard shout-out",
  hypothesis: "Leaderboard recognition drives repeat rankings",
  primaryCta: "Rank this week's QBs",
  destinationUrl: "https://rankeyeq.com/vikings",
  executionPlan: null,
  startsAt: new Date("2026-10-01T05:00:00Z"),
  endsAt: new Date("2026-10-29T05:00:00Z"),
  targetCount: 1,
};

describe("ACTIVE campaign contract", () => {
  it("accepts a complete brief", () => {
    expect(activeCampaignGaps(complete)).toEqual([]);
    expect(() => assertActiveCampaignContract(complete)).not.toThrow();
  });

  it("lists every missing element", () => {
    const gaps = activeCampaignGaps({ ownerId: null, brandIds: [], objective: "", primaryAudience: null, offer: null, hypothesis: null, primaryCta: null, destinationUrl: null, executionPlan: null, startsAt: null, endsAt: null, targetCount: 0 });
    expect(gaps).toEqual(["Owner", "At least one brand", "Objective", "Audience", "Offer", "Hypothesis", "Participation action / CTA", "Destination URL or documented non-web execution plan", "Start date", "Deadline", "At least one numeric target with a metric definition"]);
  });

  it("allows product-validation outreach with a documented plan instead of a URL", () => {
    expect(activeCampaignGaps({ ...complete, destinationUrl: null, executionPlan: "Five 1:1 prototype interviews over Zoom" })).toEqual([]);
  });

  it("rejects invalid destinations and inverted dates", () => {
    expect(activeCampaignGaps({ ...complete, destinationUrl: "javascript:alert(1)" })).toContain("Destination URL must be a valid http(s) address");
    expect(activeCampaignGaps({ ...complete, endsAt: complete.startsAt })).toContain("Deadline must be after the start date");
    expect(isValidDestinationUrl("https://exactstat.com")).toBe(true);
    expect(isValidDestinationUrl("ftp://exactstat.com")).toBe(false);
  });

  it("enforces the contract on every ACTIVE entry path and material edits only", () => {
    expect(requiresActiveContract(null, "ACTIVE", false)).toBe(true);
    expect(requiresActiveContract("PLANNING", "ACTIVE", false)).toBe(true);
    expect(requiresActiveContract("PAUSED", "ACTIVE", false)).toBe(true);
    expect(requiresActiveContract("ACTIVE", "ACTIVE", true)).toBe(true);
    expect(requiresActiveContract("ACTIVE", "ACTIVE", false)).toBe(false);
    expect(requiresActiveContract("ACTIVE", "PAUSED", true)).toBe(false);
    expect(requiresActiveContract(null, "PLANNING", false)).toBe(false);
  });

  it("detects material strategy changes but ignores notes-only edits", () => {
    const before: MaterialSnapshot = { ownerId: "u", objective: "A", objectiveType: "PARTICIPATION", primaryAudience: "B", offer: null, hypothesis: null, primaryCta: "C", destinationUrl: null, executionPlan: null, startsAt: new Date("2026-10-01T05:00:00Z"), endsAt: null, brandIds: ["b", "a"] };
    expect(changedMaterialFields(before, { ...before, brandIds: ["a", "b"], objective: " A " })).toEqual([]);
    expect(changedMaterialFields(before, { ...before, offer: "New offer", startsAt: new Date("2026-10-02T05:00:00Z") })).toEqual(["offer", "startsAt"]);
  });
});

describe("Campaign money and time", () => {
  it("stores money as non-negative integer minor units, keeping blank unknown and zero explicit", () => {
    expect(parseMoneyToMinor("", "Planned spend")).toBeNull();
    expect(parseMoneyToMinor("0", "Planned spend")).toBe(0);
    expect(parseMoneyToMinor("12.5", "Planned spend")).toBe(1250);
    expect(parseMoneyToMinor("1,200.05", "Planned spend")).toBe(120005);
    expect(() => parseMoneyToMinor("-1", "Planned spend")).toThrow("non-negative");
    expect(() => parseMoneyToMinor("1.234", "Planned spend")).toThrow();
  });

  it("requires non-negative whole minutes", () => {
    expect(parseNonNegativeInteger("90", "Expected minutes")).toBe(90);
    expect(parseNonNegativeInteger("", "Expected minutes")).toBeNull();
    expect(() => parseNonNegativeInteger("-5", "Expected minutes")).toThrow();
    expect(() => parseNonNegativeInteger("1.5", "Expected minutes")).toThrow();
  });

  it("formats unknown spend distinctly from zero", () => {
    expect(formatMinor(null, "USD")).toBe("Unknown");
    expect(formatMinor(0, "USD")).toBe("$0.00");
  });
});
