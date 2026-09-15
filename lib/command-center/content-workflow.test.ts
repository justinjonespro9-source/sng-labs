import { describe, expect, it, vi } from "vitest";
import { assertContentTransition, canDeleteContent, canDeleteOpportunity, hasSubstantiveContentChange, statusAfterContentEdit, transitionExistingContent } from "./content-workflow";

describe("content workflow", () => {
  it("moves one existing record through draft, review, and approval without creating rows", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const store = { update };
    const id = "draft-1";

    await transitionExistingContent(store, id, "DRAFT", "NEEDS_REVIEW");
    await transitionExistingContent(store, id, "NEEDS_REVIEW", "REVISION_REQUESTED");
    await transitionExistingContent(store, id, "REVISION_REQUESTED", "NEEDS_REVIEW");
    await transitionExistingContent(store, id, "NEEDS_REVIEW", "APPROVED");
    await transitionExistingContent(store, id, "APPROVED", "READY");

    expect(update).toHaveBeenCalledTimes(5);
    expect(update.mock.calls.every(([request]) => request.where.id === id)).toBe(true);
    expect(Object.keys(store)).toEqual(["update"]);
  });

  it("rejects invalid lifecycle shortcuts", () => {
    expect(() => assertContentTransition("DRAFT", "APPROVED")).toThrow();
    expect(() => assertContentTransition("REVISION_REQUESTED", "APPROVED")).toThrow();
    expect(() => assertContentTransition("PUBLISHED", "DRAFT")).toThrow();
  });

  it("invalidates approval after substantive edits but not scheduling-only edits", () => {
    const content = { brandId: "brand-1", objective: "Reach fans", hook: "Game day", rationale: "Timely", body: "Copy", visualBrief: null, callToAction: null };
    expect(hasSubstantiveContentChange(content, { ...content, body: "Changed copy" })).toBe(true);
    expect(statusAfterContentEdit("APPROVED", true)).toBe("NEEDS_REVIEW");
    expect(statusAfterContentEdit("READY", true)).toBe("NEEDS_REVIEW");
    expect(statusAfterContentEdit("APPROVED", false)).toBe("APPROVED");
    expect(statusAfterContentEdit("REJECTED", false)).toBe("DRAFT");
  });

  it("only hard-deletes safe drafts and opportunities without linked content", () => {
    expect(canDeleteContent("DRAFT", false)).toBe(true);
    expect(canDeleteContent("NEEDS_REVIEW", false)).toBe(false);
    expect(canDeleteContent("DRAFT", true)).toBe(false);
    expect(canDeleteOpportunity(0)).toBe(true);
    expect(canDeleteOpportunity(1)).toBe(false);
  });
});
