export type FactPlanStatus = "CREATE" | "UNCHANGED" | "UPDATE" | "CONFLICT";

export type FactualValue = string | number | null;

export function classifyFactChange(input: {
  existingFacts?: Record<string, FactualValue>;
  incomingFacts: Record<string, FactualValue>;
  existingFinality?: string;
  incomingFinality: string;
  correctionReason?: string;
}): FactPlanStatus {
  if (!input.existingFacts) return "CREATE";
  const sameFacts = JSON.stringify(input.existingFacts) === JSON.stringify(input.incomingFacts);
  if (sameFacts && input.existingFinality === input.incomingFinality) return "UNCHANGED";
  return input.correctionReason ? "UPDATE" : "CONFLICT";
}

export function eventIncludesTeam(event: { homeTeamId?: string | null; awayTeamId?: string | null }, teamId: string) {
  return event.homeTeamId === teamId || event.awayTeamId === teamId;
}

export function participantHasSeasonTeam(
  memberships: Array<{ league: string; year: number; teamAbbreviation: string }>,
  teamAbbreviation: string,
) {
  return memberships.some((membership) => membership.league === "NFL" && membership.year === 2026 && membership.teamAbbreviation === teamAbbreviation);
}
