import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeNflTeamAbbreviation } from "./import-schema";

export const SPORTS_STAT_IMPORT_VERSION = "sng-nfl-event-stats-v1";
export const SPORTS_STAT_PARSER_VERSION = "sports-v1c-1";

const nullableCount = z.number().int().min(0).nullable().optional();
const nullableYards = z.number().int().min(-100).nullable().optional();
const finality = z.enum(["PROVISIONAL", "FINAL", "CORRECTED", "VOID"]).default("PROVISIONAL");

const commonRow = z.object({
  eventKey: z.string().trim().min(1),
  teamAbbreviation: z.string().trim().min(2).max(4).transform(normalizeNflTeamAbbreviation),
  finality,
});

export const playerEventStatRowSchema = commonRow.extend({
  kind: z.literal("PLAYER"),
  provider: z.string().trim().min(1),
  externalId: z.string().trim().min(1),
  canonicalName: z.string().trim().min(1),
  fantasyPosition: z.enum(["QB", "RB", "WR", "TE"]).optional(),
  passingYards: nullableYards,
  passingTouchdowns: nullableCount,
  interceptionsThrown: nullableCount,
  rushingYards: nullableYards,
  rushingTouchdowns: nullableCount,
  receptions: nullableCount,
  receivingYards: nullableYards,
  receivingTouchdowns: nullableCount,
  twoPointConversions: nullableCount,
  fumblesLost: nullableCount,
  returnTouchdowns: nullableCount,
});

export const defenseEventStatRowSchema = commonRow.extend({
  kind: z.literal("TEAM_DEFENSE"),
  sacks: nullableCount,
  defensiveInterceptions: nullableCount,
  fumbleRecoveries: nullableCount,
  defensiveTouchdowns: nullableCount,
  specialTeamsTouchdowns: nullableCount,
  safeties: nullableCount,
  blockedKicks: nullableCount,
  pointsAllowed: nullableCount,
});

export const eventStatRowSchema = z.discriminatedUnion("kind", [playerEventStatRowSchema, defenseEventStatRowSchema]);

export const eventStatPayloadSchema = z.object({
  contractVersion: z.literal(SPORTS_STAT_IMPORT_VERSION),
  league: z.literal("NFL"),
  year: z.literal(2026),
  sourceType: z.string().trim().min(1).default("OPERATOR_JSON"),
  sourceLabel: z.string().trim().min(1),
  sourceReference: z.string().trim().optional(),
  sourceTimestamp: z.iso.datetime().optional(),
  correctionReason: z.string().trim().min(1).optional(),
  rows: z.array(eventStatRowSchema).min(1),
}).superRefine((payload, context) => {
  const kinds = new Set(payload.rows.map((row) => row.kind));
  if (kinds.size > 1) {
    context.addIssue({ code: "custom", path: ["rows"], message: "Use separate imports for player and DEF/DST factual performances" });
  }
  const identities = new Set<string>();
  payload.rows.forEach((row, index) => {
    const identity = row.kind === "PLAYER"
      ? `${row.kind}|${row.eventKey}|${row.provider}|${row.externalId}`
      : `${row.kind}|${row.eventKey}|${row.teamAbbreviation}`;
    if (identities.has(identity)) {
      context.addIssue({ code: "custom", path: ["rows", index], message: `Duplicate factual performance row ${identity}` });
    }
    identities.add(identity);
  });
});

export type EventStatPayload = z.infer<typeof eventStatPayloadSchema>;
export type EventStatRow = z.infer<typeof eventStatRowSchema>;

export function checksumStatImport(rawPayload: string) {
  return createHash("sha256").update(SPORTS_STAT_PARSER_VERSION).update("\0").update(rawPayload).digest("hex");
}

export const PLAYER_STAT_FIELDS = [
  "passingYards", "passingTouchdowns", "interceptionsThrown", "rushingYards",
  "rushingTouchdowns", "receptions", "receivingYards", "receivingTouchdowns",
  "twoPointConversions", "fumblesLost", "returnTouchdowns",
] as const;

export const DEFENSE_STAT_FIELDS = [
  "sacks", "defensiveInterceptions", "fumbleRecoveries", "defensiveTouchdowns",
  "specialTeamsTouchdowns", "safeties", "blockedKicks", "pointsAllowed",
] as const;
