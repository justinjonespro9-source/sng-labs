import { addCentralDays, startOfCentralDay } from "./time";

export const closedRelationshipStages = new Set(["CLOSED", "NOT_PURSUING"]);

export const relationshipStages = ["PROSPECT", "CONTACTED", "CONVERSATION", "OPPORTUNITY", "PARTNER", "CLOSED", "NOT_PURSUING"] as const;
export type RelationshipStageName = (typeof relationshipStages)[number];

/** BD pipeline labels. OPPORTUNITY here is a deal stage, not a Content Opportunity. */
export const relationshipStageLabels: Record<RelationshipStageName, string> = {
  PROSPECT: "Prospect",
  CONTACTED: "Contacted",
  CONVERSATION: "Conversation",
  OPPORTUNITY: "BD opportunity",
  PARTNER: "Partner",
  CLOSED: "Closed",
  NOT_PURSUING: "Not pursuing",
};

export const organizationTypeGuidance: Record<string, string> = {
  MEDIA: "Journalists, publications, shows",
  CREATOR: "Individual influencers and creators",
  CREATOR_NETWORK: "Creator networks and multi-channel groups",
  PODCAST: "Podcasts and audio shows",
  TEAM: "Teams and team properties",
  VENUE: "Venues and event operators",
  PARTNER: "Strategic or licensing partners",
  AGENCY: "Agencies and intermediaries",
  INVESTOR: "Investors and capital partners",
  OTHER: "Other organizations",
};

/** Operating rules, not facts about prospect interest. Adjust here; the UI labels them as rules. */
export const relationshipOperatingRules = {
  dueWithinDays: 7,
  stalledAfterDays: 21,
  recentResponseDays: 14,
};

export function activeRelationshipRequiresNextStep(stage: string) {
  return isActiveRelationship(stage);
}

export function relationshipOperatingGaps(input: { stage: string; nextAction: string | null | undefined; nextFollowUpAt: Date | null | undefined }) {
  if (!activeRelationshipRequiresNextStep(input.stage)) return [] as string[];
  const gaps: string[] = [];
  if (!input.nextAction?.trim()) gaps.push("Next action is required for active relationship stages");
  if (!input.nextFollowUpAt) gaps.push("Next follow-up date is required for active relationship stages");
  return gaps;
}

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
