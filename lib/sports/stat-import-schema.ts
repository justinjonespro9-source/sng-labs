import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeNflTeamAbbreviation } from "./import-schema";

export const SPORTS_STAT_IMPORT_VERSION = "sng-nfl-event-stats-v1";
export const SPORTS_STAT_PARSER_VERSION = "sports-v1c1-1";

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
  participationStatus: z.enum([
    "PARTICIPATED_WITH_STATS",
    "PARTICIPATED_ZERO",
    "DID_NOT_PARTICIPATE",
    "UNKNOWN",
  ]),
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

const coverageSchema = z.object({
  week: z.number().int().min(1).max(22),
  kind: z.enum(["PLAYER", "TEAM_DEFENSE"]),
  scope: z.enum(["SOURCE_REPORTED_FANTASY_PARTICIPANTS", "SNAP_VERIFIED_FANTASY_PARTICIPANTS", "EXPLICIT_TEAM_DEFENSES"]),
  finality: z.literal("FINAL"),
  sourceComplete: z.literal(true),
  expectedEventCount: z.number().int().positive(),
  expectedRowCount: z.number().int().positive(),
  eventRowCounts: z.record(z.string().min(1), z.number().int().positive()),
});

export const eventStatPayloadSchema = z.object({
  contractVersion: z.literal(SPORTS_STAT_IMPORT_VERSION),
  league: z.literal("NFL"),
  year: z.literal(2026),
  sourceType: z.string().trim().min(1).default("OPERATOR_JSON"),
  sourceLabel: z.string().trim().min(1),
  sourceReference: z.string().trim().optional(),
  sourceTimestamp: z.iso.datetime().optional(),
  sourceChecksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  sourceComponents: z.array(z.object({
    label: z.string().trim().min(1),
    reference: z.string().trim().min(1),
    timestamp: z.iso.datetime(),
    checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  })).min(1).optional(),
  coverage: coverageSchema,
  correctionReason: z.string().trim().min(1).optional(),
  rows: z.array(eventStatRowSchema).min(1),
}).superRefine((payload, context) => {
  const kinds = new Set(payload.rows.map((row) => row.kind));
  if (kinds.size > 1) {
    context.addIssue({ code: "custom", path: ["rows"], message: "Use separate imports for player and DEF/DST factual performances" });
  }
  const rowKind = payload.rows[0]?.kind;
  if (payload.coverage.kind !== rowKind) {
    context.addIssue({ code: "custom", path: ["coverage", "kind"], message: "Coverage kind must match imported row kind" });
  }
  if (payload.coverage.expectedRowCount !== payload.rows.length) {
    context.addIssue({ code: "custom", path: ["coverage", "expectedRowCount"], message: "Coverage row count must match the payload" });
  }
  const actualEventCounts = new Map<string, number>();
  for (const row of payload.rows) actualEventCounts.set(row.eventKey, (actualEventCounts.get(row.eventKey) ?? 0) + 1);
  if (actualEventCounts.size !== payload.coverage.expectedEventCount) {
    context.addIssue({ code: "custom", path: ["coverage", "expectedEventCount"], message: "Coverage event count must match the payload" });
  }
  for (const [eventKey, expected] of Object.entries(payload.coverage.eventRowCounts)) {
    if (actualEventCounts.get(eventKey) !== expected) {
      context.addIssue({ code: "custom", path: ["coverage", "eventRowCounts", eventKey], message: `Expected ${expected} rows for ${eventKey}` });
    }
  }
  if (Object.keys(payload.coverage.eventRowCounts).length !== actualEventCounts.size) {
    context.addIssue({ code: "custom", path: ["coverage", "eventRowCounts"], message: "Coverage must enumerate every imported event" });
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

    if (row.kind === "PLAYER") {
      const values = PLAYER_STAT_FIELDS.map((field) => row[field]);
      const completeFacts = values.every((value) => typeof value === "number");
      const allZero = completeFacts && values.every((value) => value === 0);
      if (["PARTICIPATED_WITH_STATS", "PARTICIPATED_ZERO"].includes(row.participationStatus) && !completeFacts) {
        context.addIssue({ code: "custom", path: ["rows", index], message: "Participating players require every factual field, including explicit zeroes" });
      }
      if (row.participationStatus === "PARTICIPATED_ZERO" && !allZero) {
        context.addIssue({ code: "custom", path: ["rows", index, "participationStatus"], message: "PARTICIPATED_ZERO requires all factual fields to be zero" });
      }
      if (row.participationStatus === "PARTICIPATED_WITH_STATS" && allZero) {
        context.addIssue({ code: "custom", path: ["rows", index, "participationStatus"], message: "Use PARTICIPATED_ZERO for an all-zero factual line" });
      }
      if (["DID_NOT_PARTICIPATE", "UNKNOWN"].includes(row.participationStatus) && values.some((value) => value != null)) {
        context.addIssue({ code: "custom", path: ["rows", index], message: "Non-participant or unknown rows cannot carry factual statistics" });
      }
    } else if (DEFENSE_STAT_FIELDS.some((field) => typeof row[field] !== "number")) {
      context.addIssue({ code: "custom", path: ["rows", index], message: "Final DEF/DST rows require every factual field, including explicit pointsAllowed" });
    }
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

export const PLAYER_FACT_FIELDS = ["participationStatus", ...PLAYER_STAT_FIELDS] as const;

export const DEFENSE_STAT_FIELDS = [
  "sacks", "defensiveInterceptions", "fumbleRecoveries", "defensiveTouchdowns",
  "specialTeamsTouchdowns", "safeties", "blockedKicks", "pointsAllowed",
] as const;
