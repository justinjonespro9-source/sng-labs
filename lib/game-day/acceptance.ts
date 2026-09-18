export function recommendationAcceptanceDecision(input: { outcome: "CREATE_OPPORTUNITY" | "SKIP" | "NEEDS_CONTEXT"; acceptedOpportunityId: string | null }) {
  if (input.acceptedOpportunityId) return { kind: "EXISTING" as const, opportunityId: input.acceptedOpportunityId };
  if (input.outcome === "SKIP") return { kind: "REJECT" as const, reason: "A skip recommendation cannot create an Opportunity" };
  return { kind: "CREATE" as const };
}
