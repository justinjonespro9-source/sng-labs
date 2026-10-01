import { participantEvidenceSchema, type ParticipantEvidence } from "./export-schema";

export function normalizeExportTeam(value: string) {
  const team = value.trim().toUpperCase();
  return ({ WAS: "WSH", LA: "LAR" } as Record<string,string>)[team] ?? team;
}
export function frozenWeeklyEligibility(rows: ParticipantEvidence[], participantId: string, eventKey: string) {
  const matches = rows.filter(row => row.participantId === participantId && row.eventKey === eventKey);
  if (matches.length !== 1) throw new Error(`Missing or ambiguous frozen weekly eligibility: ${participantId}`);
  return participantEvidenceSchema.parse(matches[0]);
}
export const scorableParticipation = (state: string) => state === "PARTICIPATED_WITH_STATS" || state === "PARTICIPATED_ZERO";
