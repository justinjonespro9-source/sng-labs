import { describe, expect, it } from "vitest";
import { recommendationAcceptanceDecision } from "./acceptance";

describe("recommendation acceptance idempotency", () => {
  it("reuses the linked Opportunity when Accept is retried", () => {
    expect(recommendationAcceptanceDecision({ outcome: "CREATE_OPPORTUNITY", acceptedOpportunityId: "opportunity-1" })).toEqual({ kind: "EXISTING", opportunityId: "opportunity-1" });
  });

  it("allows reviewed missing-context recommendations but never SKIP", () => {
    expect(recommendationAcceptanceDecision({ outcome: "NEEDS_CONTEXT", acceptedOpportunityId: null })).toEqual({ kind: "CREATE" });
    expect(recommendationAcceptanceDecision({ outcome: "SKIP", acceptedOpportunityId: null }).kind).toBe("REJECT");
  });
});
