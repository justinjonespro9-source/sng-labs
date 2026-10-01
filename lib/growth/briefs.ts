export const growthStages = ["DEVELOPMENT", "VALIDATION", "PILOT", "ACQUISITION", "RETENTION"] as const;
export type GrowthStage = (typeof growthStages)[number];

export const growthStageLabels: Record<GrowthStage, string> = {
  DEVELOPMENT: "Development",
  VALIDATION: "Validation",
  PILOT: "Pilot",
  ACQUISITION: "Acquisition",
  RETENTION: "Retention",
};

export type BriefContent = {
  stage: GrowthStage;
  priorityAudience: string | null;
  marketId: string | null;
  geographyNotes: string | null;
  offer: string | null;
  activationDefinition: string | null;
  repeatDefinition: string | null;
  bottleneck: string | null;
  primaryMotion: string | null;
  capacityNotes: string | null;
  effectiveAt: Date | null;
  reviewAt: Date | null;
  notes: string | null;
};

export const briefFieldLabels: Record<keyof Omit<BriefContent, "stage" | "marketId">, string> = {
  priorityAudience: "Priority audience",
  geographyNotes: "Geography notes",
  offer: "Offer",
  activationDefinition: "Activation definition",
  repeatDefinition: "Repeat definition",
  bottleneck: "Current bottleneck",
  primaryMotion: "Primary growth motion",
  capacityNotes: "Capacity notes",
  effectiveAt: "Effective date",
  reviewAt: "Review date",
  notes: "Notes",
};

const requiredForApproval = ["priorityAudience", "offer", "activationDefinition", "bottleneck", "primaryMotion", "effectiveAt", "reviewAt"] as const;

function blank(value: string | Date | null | undefined) {
  return value === null || value === undefined || (typeof value === "string" && !value.trim());
}

/** Drafts may be partial; a brief only becomes CURRENT once every field the operator must commit to is present. */
export function briefApprovalGaps(brief: BriefContent) {
  const gaps: string[] = requiredForApproval.filter((field) => blank(brief[field])).map((field) => briefFieldLabels[field]);
  if (brief.effectiveAt && brief.reviewAt && brief.reviewAt <= brief.effectiveAt) gaps.push("Review date must be after the effective date");
  return gaps;
}

export function assertBriefApprovable(brief: BriefContent) {
  const gaps = briefApprovalGaps(brief);
  if (gaps.length) throw new Error(`Growth Brief is incomplete: ${gaps.join(", ")}`);
}

export function nextRevision(existingRevisions: number[]) {
  return existingRevisions.reduce((max, revision) => Math.max(max, revision), 0) + 1;
}

export type ReviewState = "NOT_SCHEDULED" | "OVERDUE" | "DUE_SOON" | "SCHEDULED";

export function reviewState(reviewAt: Date | null | undefined, now: Date, dueSoonDays = 7): ReviewState {
  if (!reviewAt) return "NOT_SCHEDULED";
  if (reviewAt.getTime() <= now.getTime()) return "OVERDUE";
  if (reviewAt.getTime() - now.getTime() <= dueSoonDays * 86_400_000) return "DUE_SOON";
  return "SCHEDULED";
}
