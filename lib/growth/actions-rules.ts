export const growthActionStatuses = ["OPEN", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
export type GrowthActionStatus = (typeof growthActionStatuses)[number];

export const growthActionStatusLabels: Record<GrowthActionStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

function normalizeTitle(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export type GrowthActionDraft = {
  title: string;
  status: GrowthActionStatus;
  blocker: string | null;
  operatorPriority: number | null;
  relationship?: { nextAction: string | null } | null;
};

/** GrowthActions are real work. A relationship's own next action is already shown from the Relationship record and must not be duplicated here. */
export function validateGrowthAction(input: GrowthActionDraft) {
  if (!input.title.trim()) throw new Error("A title is required");
  if (input.status === "BLOCKED" && !input.blocker?.trim()) throw new Error("Describe the blocker for a BLOCKED action");
  if (input.operatorPriority !== null && (!Number.isInteger(input.operatorPriority) || input.operatorPriority < 1 || input.operatorPriority > 99)) throw new Error("Priority must be a whole number from 1 (highest) to 99");
  if (input.relationship?.nextAction && normalizeTitle(input.relationship.nextAction) === normalizeTitle(input.title)) {
    throw new Error("This is already the relationship's next action. Update the relationship instead of creating a duplicate action.");
  }
}

export function completedAtFor(previous: GrowthActionStatus | null, next: GrowthActionStatus, existing: Date | null, now: Date) {
  if (next === "DONE") return previous === "DONE" && existing ? existing : now;
  return null;
}

export type RankableAction = { id: string; status: GrowthActionStatus; operatorPriority: number | null; dueAt: Date | null; createdAt: Date };

/** This Week shows at most three actions the operator explicitly prioritized; nothing is auto-selected. */
export function thisWeekActions<T extends RankableAction>(actions: T[], limit = 3) {
  return actions
    .filter((action) => (action.status === "OPEN" || action.status === "IN_PROGRESS") && action.operatorPriority !== null)
    .sort((a, b) => (a.operatorPriority ?? 0) - (b.operatorPriority ?? 0) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) || a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, limit);
}
