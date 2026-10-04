import { describe, expect, it } from "vitest";
import { assertBriefApprovable, briefApprovalGaps, nextRevision, reviewState, type BriefContent } from "./briefs";
import { assertCanAllocatePortfolio, assertCanEditGrowth, canAllocatePortfolio, canEditGrowth } from "./permissions";
import { parseWeeklyHours, portfolioCapacityWarnings } from "./priorities";

const complete: BriefContent = {
  stage: "VALIDATION",
  priorityAudience: "Season-long fantasy players in Minnesota",
  marketId: null,
  geographyNotes: null,
  offer: "Free weekly picks challenge",
  activationDefinition: "Submits first weekly picks",
  repeatDefinition: "Submits picks in 3 of 4 weeks",
  bottleneck: "Comprehension of scoring",
  primaryMotion: "Creator outreach",
  capacityNotes: null,
  effectiveAt: new Date("2026-10-01T05:00:00Z"),
  reviewAt: new Date("2026-10-29T05:00:00Z"),
  notes: null,
};

describe("Growth Brief rules", () => {
  it("allows partial drafts but lists every gap before approval", () => {
    const gaps = briefApprovalGaps({ ...complete, offer: " ", bottleneck: null, reviewAt: null });
    expect(gaps).toEqual(["Offer", "Current bottleneck", "Review date"]);
    expect(() => assertBriefApprovable({ ...complete, offer: null })).toThrow("Growth Brief is incomplete: Offer");
  });

  it("requires review after the effective date", () => {
    expect(briefApprovalGaps({ ...complete, reviewAt: complete.effectiveAt })).toContain("Review date must be after the effective date");
    expect(briefApprovalGaps(complete)).toEqual([]);
  });

  it("assigns monotonically increasing revisions", () => {
    expect(nextRevision([])).toBe(1);
    expect(nextRevision([1, 3, 2])).toBe(4);
  });

  it("classifies review dates", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    expect(reviewState(null, now)).toBe("NOT_SCHEDULED");
    expect(reviewState(new Date("2026-10-09T12:00:00Z"), now)).toBe("OVERDUE");
    expect(reviewState(new Date("2026-10-15T12:00:00Z"), now)).toBe("DUE_SOON");
    expect(reviewState(new Date("2026-11-15T12:00:00Z"), now)).toBe("SCHEDULED");
  });
});

describe("Growth permissions", () => {
  it("lets Owner/Admin/Editor edit strategy and measurement but keeps Viewer read-only", () => {
    expect(["OWNER", "ADMIN", "EDITOR"].every(canEditGrowth)).toBe(true);
    expect(canEditGrowth("VIEWER")).toBe(false);
    expect(() => assertCanEditGrowth("VIEWER")).toThrow("Forbidden");
  });

  it("restricts portfolio allocation to Owner/Admin", () => {
    expect(canAllocatePortfolio("OWNER")).toBe(true);
    expect(canAllocatePortfolio("ADMIN")).toBe(true);
    expect(canAllocatePortfolio("EDITOR")).toBe(false);
    expect(canAllocatePortfolio("VIEWER")).toBe(false);
    expect(() => assertCanAllocatePortfolio("EDITOR")).toThrow("Owner or Admin");
  });
});

describe("Portfolio priorities", () => {
  it("warns about split attention instead of choosing a winner", () => {
    const warnings = portfolioCapacityWarnings([
      { brandName: "RankEyeQ", allocation: "PRIMARY_PUSH", weeklyHours: 20 },
      { brandName: "ExactStat", allocation: "PRIMARY_PUSH", weeklyHours: 15 },
      { brandName: "Stadium Slop", allocation: "HOLD", weeklyHours: null },
    ], 30);
    expect(warnings[0]).toContain("2 brands are marked Primary push");
    expect(warnings[1]).toContain("35");
    expect(portfolioCapacityWarnings([{ brandName: "RankEyeQ", allocation: "PRIMARY_PUSH", weeklyHours: 10 }])).toEqual([]);
  });

  it("validates weekly hours", () => {
    expect(parseWeeklyHours("")).toBeNull();
    expect(parseWeeklyHours("0")).toBe(0);
    expect(() => parseWeeklyHours("-1")).toThrow();
    expect(() => parseWeeklyHours("2.5")).toThrow();
  });
});
