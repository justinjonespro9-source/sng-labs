import { describe, expect, it } from "vitest";
import { completedAtFor, thisWeekActions, validateGrowthAction } from "./actions-rules";
import { accountHealthSummary, isOpenOpportunity, latestSnapshotPerAccount, openOpportunityWhere } from "./dashboard";
import { assertManualConfirmable, isSchedulableDestination, manualDestinationGaps, validateProfileUrl, validatePublishedAt, validatePublishedUrl } from "./manual-publication";
import { groupRelationshipViews, relationshipViewKeys, type RelationshipOperatingRow } from "./relationships";

const now = new Date("2026-10-15T17:00:00Z");

describe("relationship operating views", () => {
  const base: RelationshipOperatingRow = { id: "r", stage: "CONVERSATION", nextAction: "Send pilot recap", nextFollowUpAt: null, lastOutreachAt: new Date("2026-10-10T12:00:00Z"), createdAt: new Date("2026-09-01T12:00:00Z"), lastActivityAt: new Date("2026-10-10T12:00:00Z"), lastInboundAt: null };

  it("classifies due and overdue on Central day boundaries", () => {
    expect(relationshipViewKeys({ ...base, nextFollowUpAt: new Date("2026-10-15T06:00:00Z") }, now)).toContain("due");
    expect(relationshipViewKeys({ ...base, nextFollowUpAt: new Date("2026-10-15T04:00:00Z") }, now)).toContain("overdue");
    expect(relationshipViewKeys({ ...base, nextFollowUpAt: new Date("2026-11-30T12:00:00Z") }, now)).not.toContain("due");
  });

  it("flags missing next action even when a follow-up date exists", () => {
    expect(relationshipViewKeys({ ...base, nextAction: "  ", nextFollowUpAt: new Date("2026-10-16T12:00:00Z") }, now)).toEqual(["due", "noNextAction"]);
  });

  it("marks stalled by the configurable operating rule and ignores closed relationships", () => {
    const quiet = { ...base, lastOutreachAt: new Date("2026-09-01T12:00:00Z"), lastActivityAt: new Date("2026-09-01T12:00:00Z") };
    expect(relationshipViewKeys(quiet, now)).toContain("stalled");
    expect(relationshipViewKeys(quiet, now, { dueWithinDays: 7, stalledAfterDays: 60, recentResponseDays: 14 })).not.toContain("stalled");
    expect(relationshipViewKeys({ ...quiet, stage: "CLOSED", nextAction: null }, now)).toEqual([]);
  });

  it("surfaces recent inbound responses only", () => {
    const groups = groupRelationshipViews([{ ...base, id: "in", lastInboundAt: new Date("2026-10-14T12:00:00Z") }, { ...base, id: "old", lastInboundAt: new Date("2026-08-01T12:00:00Z") }], now);
    expect(groups.recentResponses.map((r) => r.id)).toEqual(["in"]);
  });
});

describe("growth actions", () => {
  it("requires a blocker for BLOCKED and a valid priority", () => {
    expect(() => validateGrowthAction({ title: "Ship scorecard", status: "BLOCKED", blocker: null, operatorPriority: 1 })).toThrow("blocker");
    expect(() => validateGrowthAction({ title: "Ship scorecard", status: "OPEN", blocker: null, operatorPriority: 0 })).toThrow("Priority");
    expect(() => validateGrowthAction({ title: "Ship scorecard", status: "OPEN", blocker: null, operatorPriority: null })).not.toThrow();
  });

  it("refuses to duplicate a relationship's own next action", () => {
    expect(() => validateGrowthAction({ title: "Send  pilot recap", status: "OPEN", blocker: null, operatorPriority: 1, relationship: { nextAction: "send pilot recap" } })).toThrow("already the relationship's next action");
  });

  it("selects at most three operator-prioritized open actions", () => {
    const at = new Date("2026-10-01T00:00:00Z");
    const actions = [
      { id: "a", status: "OPEN" as const, operatorPriority: 3, dueAt: null, createdAt: at },
      { id: "b", status: "IN_PROGRESS" as const, operatorPriority: 1, dueAt: null, createdAt: at },
      { id: "c", status: "DONE" as const, operatorPriority: 1, dueAt: null, createdAt: at },
      { id: "d", status: "OPEN" as const, operatorPriority: null, dueAt: null, createdAt: at },
      { id: "e", status: "OPEN" as const, operatorPriority: 2, dueAt: new Date("2026-10-20T00:00:00Z"), createdAt: at },
      { id: "f", status: "OPEN" as const, operatorPriority: 2, dueAt: new Date("2026-10-18T00:00:00Z"), createdAt: at },
    ];
    expect(thisWeekActions(actions).map((a) => a.id)).toEqual(["b", "f", "e"]);
  });

  it("stamps completion only when done", () => {
    expect(completedAtFor("OPEN", "DONE", null, now)).toBe(now);
    const earlier = new Date("2026-10-01T00:00:00Z");
    expect(completedAtFor("DONE", "DONE", earlier, now)).toBe(earlier);
    expect(completedAtFor("DONE", "OPEN", earlier, now)).toBeNull();
  });
});

describe("dashboard read rules", () => {
  it("shows only open, unexpired opportunities", () => {
    expect(isOpenOpportunity({ status: "NEW", expiresAt: null }, now)).toBe(true);
    expect(isOpenOpportunity({ status: "QUEUED", expiresAt: new Date("2026-10-16T00:00:00Z") }, now)).toBe(true);
    for (const status of ["COMPLETE", "NO_POST", "DISMISSED"]) expect(isOpenOpportunity({ status, expiresAt: null }, now)).toBe(false);
    expect(isOpenOpportunity({ status: "NEW", expiresAt: new Date("2026-10-14T00:00:00Z") }, now)).toBe(false);
    expect(openOpportunityWhere(now).status.in).toEqual(["NEW", "REVIEWED", "DEVELOPING", "QUEUED"]);
  });

  it("counts distinct accounts by their latest snapshot with deterministic tie-break", () => {
    const t1 = new Date("2026-10-01T00:00:00Z");
    const t2 = new Date("2026-10-08T00:00:00Z");
    const rows = [
      { id: "s1", socialAccountId: "acct_a", state: "AT_RISK" as const, calculatedAt: t1 },
      { id: "s2", socialAccountId: "acct_a", state: "WATCH" as const, calculatedAt: t1 },
      { id: "s3", socialAccountId: "acct_a", state: "HEALTHY" as const, calculatedAt: t2 },
      { id: "s4", socialAccountId: "acct_b", state: "WATCH" as const, calculatedAt: t1 },
      { id: "s6", socialAccountId: "acct_c", state: "AT_RISK" as const, calculatedAt: t2 },
      { id: "s5", socialAccountId: "acct_c", state: "HEALTHY" as const, calculatedAt: t2 },
    ];
    expect(latestSnapshotPerAccount(rows).get("acct_c")?.id).toBe("s6");
    expect(accountHealthSummary(["acct_a", "acct_b", "acct_c", "acct_d"], rows)).toEqual({ healthy: 1, watch: 1, atRisk: 1, unknown: 1, onWatch: 2 });
  });
});

describe("manual publication guards", () => {
  const verified = { brandId: "brand_rank", lifecycleStatus: "KNOWN" as const, connectionStatus: "NOT_CONNECTED", metadataVerifiedAt: new Date("2026-10-01T00:00:00Z"), profileUrl: "https://x.com/rankeyeq", handle: "@rankeyeq" };

  it("accepts a same-brand manually verified known account without API authorization", () => {
    expect(manualDestinationGaps(verified, "brand_rank")).toEqual([]);
    expect(isSchedulableDestination(verified, "brand_rank")).toBe(true);
  });

  it("rejects other brands, disallowed lifecycle and unverified identity", () => {
    expect(manualDestinationGaps(verified, "brand_other")).toContain("Destination belongs to a different brand");
    expect(manualDestinationGaps({ ...verified, lifecycleStatus: "DISABLED" }, "brand_rank")).toContain("Destination lifecycle is DISABLED");
    expect(manualDestinationGaps({ ...verified, metadataVerifiedAt: null }, "brand_rank")[0]).toContain("not been manually verified");
    expect(isSchedulableDestination({ ...verified, metadataVerifiedAt: null, connectionStatus: "CONNECTED" }, "brand_rank")).toBe(true);
    expect(isSchedulableDestination({ ...verified, metadataVerifiedAt: null }, "brand_rank")).toBe(false);
  });

  it("validates the platform URL", () => {
    expect(validatePublishedUrl("X", "https://x.com/rankeyeq/status/123")).toBe("https://x.com/rankeyeq/status/123");
    expect(validatePublishedUrl("INSTAGRAM", "https://www.instagram.com/p/abc/")).toContain("instagram.com");
    expect(() => validatePublishedUrl("X", "http://x.com/rankeyeq/status/1")).toThrow("https");
    expect(() => validatePublishedUrl("X", "https://evil-x.com/status/1")).toThrow("x.com");
    expect(() => validatePublishedUrl("X", "https://x.com/")).toThrow("specific post");
    expect(() => validatePublishedUrl("OTHER", "not a url")).toThrow("not a valid URL");
  });

  it("validates a manually verified profile URL against the account platform", () => {
    expect(validateProfileUrl("X", "https://x.com/rankeyeq")).toBe("https://x.com/rankeyeq");
    expect(validateProfileUrl("X", "https://twitter.com/rankeyeq")).toContain("twitter.com");
    expect(() => validateProfileUrl("X", "https://www.facebook.com/rankeyeq")).toThrow("x.com");
    expect(() => validateProfileUrl("INSTAGRAM", "http://instagram.com/rankeyeq")).toThrow("https");
    expect(() => validateProfileUrl("X", "https://user:pw@x.com/rankeyeq")).toThrow("credentials");
    expect(validateProfileUrl("OTHER", "https://example.com/team")).toBe("https://example.com/team");
  });

  it("requires a prepared manual handoff with a current approval and blocks repeats", () => {
    const ready = { draftStatus: "READY", latestApprovalDecision: "APPROVED", latestApprovalAt: new Date("2026-10-10T00:00:00Z"), publication: { status: "READY", method: "MANUAL" } };
    expect(() => assertManualConfirmable(ready)).not.toThrow();
    expect(() => assertManualConfirmable({ ...ready, publication: { status: "PUBLISHED", method: "MANUAL" } })).toThrow("already recorded as PUBLISHED");
    expect(() => assertManualConfirmable({ ...ready, publication: { status: "PLANNED", method: null } })).toThrow("Prepare a manual handoff");
    expect(() => assertManualConfirmable({ ...ready, draftStatus: "NEEDS_REVIEW" })).toThrow("must be READY");
    expect(() => assertManualConfirmable({ ...ready, latestApprovalDecision: "REVISION_REQUESTED" })).toThrow("re-approve");
  });

  it("validates the published time", () => {
    const approvedAt = new Date("2026-10-10T00:00:00Z");
    expect(validatePublishedAt(new Date("2026-10-12T00:00:00Z"), approvedAt, now)).toEqual(new Date("2026-10-12T00:00:00Z"));
    expect(() => validatePublishedAt(new Date("2026-10-20T00:00:00Z"), approvedAt, now)).toThrow("future");
    expect(() => validatePublishedAt(new Date("2026-10-01T00:00:00Z"), approvedAt, now)).toThrow("before the content was approved");
    expect(() => validatePublishedAt(null, approvedAt, now)).toThrow("valid published time");
  });
});
