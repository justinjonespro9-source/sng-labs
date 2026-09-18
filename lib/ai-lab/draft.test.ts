import { describe, expect, it } from "vitest";
import { draftCreationDecision } from "./draft";

describe("AI Lab draft handoff", () => {
  it("is idempotent once a Content record is linked", () => {
    expect(draftCreationDecision({ status: "SUCCEEDED", recommendation: "CREATE", opportunityId: "opp", brandId: "brand", contentId: "draft-1" })).toEqual({ kind: "EXISTING", contentId: "draft-1" });
  });

  it("requires CREATE and an existing Opportunity", () => {
    expect(() => draftCreationDecision({ status: "SUCCEEDED", recommendation: "DO_NOT_POST", opportunityId: "opp", brandId: "brand", contentId: null })).toThrow("Only CREATE");
    expect(() => draftCreationDecision({ status: "SUCCEEDED", recommendation: "CREATE", opportunityId: null, brandId: "brand", contentId: null })).toThrow("existing Opportunity");
  });
});
