import { z } from "zod";
import { NFL_POSITION_ELIGIBILITY_VERSION } from "./rules";

export const ARTIFACT_SCHEMA_VERSION = "sng-canonical-nfl-weekly-performance/1";
export const POSITIONS = ["QB", "RB", "WR", "TE", "DEF"] as const;
export const positionSchema = z.enum(POSITIONS);
export const checksumSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const sourceEvidenceSchema = z.object({
  label: z.string().trim().min(1), reference: z.string().trim().min(1),
  checksum: checksumSchema, observedAt: z.iso.datetime(),
}).strict();
export const identitySchema = z.object({ provider: z.string().min(1), externalId: z.string().min(1), evidence: sourceEvidenceSchema }).strict();
export const participationSchema = z.enum(["PARTICIPATED_WITH_STATS", "PARTICIPATED_ZERO", "VERIFIED_NON_PARTICIPANT", "UNKNOWN_INCOMPLETE", "ABSENT_UNRESOLVED"]);
export const participantEvidenceSchema = z.object({
  participantId: z.string().min(1), kind: z.enum(["PLAYER", "TEAM_DEFENSE"]), position: positionSchema,
  eventKey: z.string().min(1).nullable(), teamKey: z.string().min(1),
  state: participationSchema,
  disposition: z.enum(["PLAYED", "DNP", "BYE", "CANCELLED_GAME", "MOVED_OUT_OF_WEEK", "NO_ROSTER_ASSIGNMENT", "UNRESOLVED"]),
  participationProof: z.enum(["COMPLETE_FACTUAL_LINE", "POSITIVE_SNAPS_COMPLETE_FACTS", "OFFICIAL_INACTIVE", "EXHAUSTIVE_GAME_PARTICIPATION", "WEEK_DISPOSITION", "NONE"]),
  channelsReviewed: z.array(z.enum(["OFFENSE", "DEFENSE", "SPECIAL_TEAMS"])),
  sourcePosition: z.string().min(1), eligibilityEvidence: sourceEvidenceSchema,
  evidence: sourceEvidenceSchema.nullable(), identities: z.array(identitySchema),
}).strict();
export const manifestSchema = z.object({
  contractVersion: z.literal("sng-weekly-coverage-manifest/1"), league: z.literal("NFL"),
  season: z.number().int().min(2000).max(2100), seasonType: z.literal("REG"), week: z.number().int().min(1).max(18),
  positionPolicyVersion: z.literal(NFL_POSITION_ELIGIBILITY_VERSION),
  scheduleEvidence: sourceEvidenceSchema, populationEvidence: sourceEvidenceSchema,
  scope: z.literal("ALL_WEEKLY_ELIGIBLE_SCORABLE_AND_UNRANKED_DISPOSITIONS"),
  channelsReviewed: z.array(z.enum(["OFFENSE", "DEFENSE", "SPECIAL_TEAMS"])),
  events: z.array(z.object({ key: z.string().min(1), homeTeamKey: z.string().min(1), awayTeamKey: z.string().min(1),
    disposition: z.enum(["PLAYED", "CANCELLED", "MOVED_OUT_OF_WEEK"]), finalityEvidence: sourceEvidenceSchema,
    playerParticipantIds: z.array(z.string().min(1)), defenseParticipantIds: z.array(z.string().min(1)),
    pointsAllowedEvidence: z.array(z.object({ participantId: z.string().min(1), pointsAllowed: z.number().int().nonnegative(), evidence: sourceEvidenceSchema }).strict()),
  }).strict()).min(1),
  participants: z.array(participantEvidenceSchema).min(1),
  sources: z.array(sourceEvidenceSchema).min(1),
  consumerContract: z.object({ playerProvider: z.string().min(1), defenseProvider: z.literal("sng-team"), evidence: sourceEvidenceSchema }).strict(),
}).strict();
export type WeeklyManifest = z.infer<typeof manifestSchema>;
export type ParticipantEvidence = z.infer<typeof participantEvidenceSchema>;
