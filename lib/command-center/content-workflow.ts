export const contentStatuses = [
  "DRAFT",
  "NEEDS_REVIEW",
  "REVISION_REQUESTED",
  "APPROVED",
  "READY",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
] as const;

export type ContentStatus = (typeof contentStatuses)[number];

const allowedTransitions: Record<ContentStatus, readonly ContentStatus[]> = {
  DRAFT: ["NEEDS_REVIEW"],
  NEEDS_REVIEW: ["APPROVED", "REVISION_REQUESTED", "REJECTED"],
  REVISION_REQUESTED: ["NEEDS_REVIEW"],
  APPROVED: ["READY", "ARCHIVED"],
  READY: ["APPROVED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"],
  REJECTED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: [],
};

export function assertContentTransition(from: ContentStatus, to: ContentStatus) {
  if (!allowedTransitions[from].includes(to)) {
    throw new Error(`Content cannot move from ${from} to ${to}`);
  }
}

export type SubstantiveContent = {
  brandId: string;
  objective: string;
  hook: string;
  rationale: string;
  body: string;
  visualBrief: string | null;
  callToAction: string | null;
};

export function hasSubstantiveContentChange(current: SubstantiveContent, next: SubstantiveContent) {
  return (Object.keys(current) as (keyof SubstantiveContent)[]).some((key) => current[key] !== next[key]);
}

export function statusAfterContentEdit(status: ContentStatus, substantiveChange: boolean): ContentStatus {
  if (status === "PUBLISHED" || status === "ARCHIVED") throw new Error(`${status} content cannot be edited`);
  if (status === "REJECTED") return "DRAFT";
  if (substantiveChange && (status === "APPROVED" || status === "READY")) return "NEEDS_REVIEW";
  return status;
}

export function canDeleteContent(status: ContentStatus, hasPublication: boolean) {
  return status === "DRAFT" && !hasPublication;
}

export function canDeleteOpportunity(linkedContentCount: number) {
  return linkedContentCount === 0;
}

type TransitionStore = {
  update(args: { where: { id: string }; data: { status: ContentStatus } }): Promise<unknown>;
};

export async function transitionExistingContent(store: TransitionStore, id: string, from: ContentStatus, to: ContentStatus) {
  assertContentTransition(from, to);
  await store.update({ where: { id }, data: { status: to } });
  return id;
}
