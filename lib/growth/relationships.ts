import { addCentralDays, startOfCentralDay } from "./time";

export const closedRelationshipStages = new Set(["CLOSED", "NOT_PURSUING"]);

/** Operating rules, not facts about prospect interest. Adjust here; the UI labels them as rules. */
export const relationshipOperatingRules = {
  dueWithinDays: 7,
  stalledAfterDays: 21,
  recentResponseDays: 14,
};

export type RelationshipOperatingRow = {
  id: string;
  stage: string;
  nextAction: string | null;
  nextFollowUpAt: Date | null;
  lastOutreachAt: Date | null;
  createdAt: Date;
  lastActivityAt: Date | null;
  lastInboundAt: Date | null;
};

export type RelationshipViewKey = "due" | "overdue" | "noNextAction" | "stalled" | "recentResponses";

export const relationshipViewLabels: Record<RelationshipViewKey, string> = {
  due: "Due",
  overdue: "Overdue",
  noNextAction: "No next action",
  stalled: "Stalled",
  recentResponses: "Recent responses",
};

export function isActiveRelationship(stage: string) {
  return !closedRelationshipStages.has(stage);
}

/** Classifies a relationship into each operating view using America/Chicago day boundaries. A row may appear in several views. */
export function relationshipViewKeys(row: RelationshipOperatingRow, now: Date, rules = relationshipOperatingRules): RelationshipViewKey[] {
  const keys: RelationshipViewKey[] = [];
  const active = isActiveRelationship(row.stage);
  const todayStart = startOfCentralDay(now);
  const dueHorizon = startOfCentralDay(addCentralDays(now, rules.dueWithinDays + 1));
  if (active && row.nextFollowUpAt) {
    if (row.nextFollowUpAt < todayStart) keys.push("overdue");
    else if (row.nextFollowUpAt < dueHorizon) keys.push("due");
  }
  if (active && !row.nextAction?.trim()) keys.push("noNextAction");
  const lastTouch = [row.lastActivityAt, row.lastOutreachAt, row.createdAt].filter((value): value is Date => Boolean(value)).reduce((latest, value) => (value > latest ? value : latest), new Date(0));
  if (active && now.getTime() - lastTouch.getTime() > rules.stalledAfterDays * 86_400_000) keys.push("stalled");
  if (row.lastInboundAt && now.getTime() - row.lastInboundAt.getTime() <= rules.recentResponseDays * 86_400_000) keys.push("recentResponses");
  return keys;
}

export function groupRelationshipViews<T extends RelationshipOperatingRow>(rows: T[], now: Date, rules = relationshipOperatingRules) {
  const groups: Record<RelationshipViewKey, T[]> = { due: [], overdue: [], noNextAction: [], stalled: [], recentResponses: [] };
  for (const row of rows) for (const key of relationshipViewKeys(row, now, rules)) groups[key].push(row);
  groups.due.sort((a, b) => (a.nextFollowUpAt?.getTime() ?? 0) - (b.nextFollowUpAt?.getTime() ?? 0));
  groups.overdue.sort((a, b) => (a.nextFollowUpAt?.getTime() ?? 0) - (b.nextFollowUpAt?.getTime() ?? 0));
  groups.recentResponses.sort((a, b) => (b.lastInboundAt?.getTime() ?? 0) - (a.lastInboundAt?.getTime() ?? 0));
  return groups;
}

export function isRelationshipViewKey(value: string | undefined | null): value is RelationshipViewKey {
  return value === "due" || value === "overdue" || value === "noNextAction" || value === "stalled" || value === "recentResponses";
}
