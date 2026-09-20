import { createHash } from "node:crypto";
import { z } from "zod";

export const SPORTS_IMPORT_PARSER_VERSION = "sports-v1b-3";
export const SNG_ROSTER_EXPORT_VERSION = "sng-sports-roster-v1";

const NFL_TEAM_ABBREVIATION_ALIASES: Readonly<Record<string, string>> = {
  WAS: "WSH",
};

const RANKEYEQ_TEST_FIXTURE_EXTERNAL_ID_PATTERNS = [
  /^test-player-trade$/,
  /^dup-test-pool\d+$/,
  /^rb-canonical-pool-integrity-\d+$/,
  /^mover-player-trade\d+$/,
  /^(?:wr-trade|wr-legacy|wr-weekteam|wr-filter|shared-id|rb-sync)-roster-team-\d+(?:-dup)?$/,
];

export function normalizeNflTeamAbbreviation(value: string) {
  const abbreviation = value.trim().toUpperCase();
  return NFL_TEAM_ABBREVIATION_ALIASES[abbreviation] ?? abbreviation;
}

export const rosterRowSchema = z.object({
  provider: z.string().trim().min(1),
  externalId: z.string().trim().min(1),
  canonicalName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).default([]),
  teamAbbreviation: z.string().trim().toUpperCase().min(2).max(4).transform(normalizeNflTeamAbbreviation),
  fantasyPosition: z.enum(["QB", "RB", "WR", "TE"]),
  sourcePosition: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "PRACTICE_SQUAD", "INJURED_RESERVE", "PUP", "SUSPENDED", "INACTIVE", "FREE_AGENT", "OTHER"]).default("ACTIVE"),
  active: z.boolean().default(true),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
  sourceStatus: z.string().trim().nullable().optional(),
});

export const rosterPayloadSchema = z.object({
  contractVersion: z.literal(SNG_ROSTER_EXPORT_VERSION).optional(),
  league: z.literal("NFL"),
  year: z.literal(2026),
  sourceLabel: z.string().trim().min(1),
  sourceReference: z.string().trim().optional(),
  sourceSyncedAt: z.iso.datetime().nullable().optional(),
  exportedAt: z.iso.datetime().optional(),
  rows: z.array(rosterRowSchema).min(1),
}).superRefine((payload, context) => {
  const externalKeys = new Set<string>();
  const compositeKeys = new Set<string>();
  payload.rows.forEach((row, index) => {
    const key = `${row.provider}:${row.externalId}`;
    if (externalKeys.has(key)) {
      context.addIssue({
        code: "custom",
        path: ["rows", index, "externalId"],
        message: `Duplicate provider identity ${key}`,
      });
    }
    externalKeys.add(key);

    const compositeKey = [
      row.canonicalName.trim().toLocaleLowerCase("en-US"),
      row.teamAbbreviation,
      row.fantasyPosition,
    ].join("|");
    if (compositeKeys.has(compositeKey)) {
      context.addIssue({
        code: "custom",
        path: ["rows", index, "canonicalName"],
        message: `Ambiguous canonical player identity ${compositeKey}`,
      });
    }
    compositeKeys.add(compositeKey);

    if (
      payload.contractVersion === SNG_ROSTER_EXPORT_VERSION &&
      RANKEYEQ_TEST_FIXTURE_EXTERNAL_ID_PATTERNS.some((pattern) =>
        pattern.test(row.externalId),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["rows", index, "externalId"],
        message: `RankEyeQ integration-test identity is not trusted roster data: ${row.externalId}`,
      });
    }
  });

  if (payload.contractVersion === SNG_ROSTER_EXPORT_VERSION) {
    const teams = new Set(payload.rows.map((row) => row.teamAbbreviation));
    if (teams.size !== 32) {
      context.addIssue({
        code: "custom",
        path: ["rows"],
        message: `League export must cover 32 NFL teams; received ${teams.size}`,
      });
    }
  }
});

export type RosterPayload = z.infer<typeof rosterPayloadSchema>;

export function checksumImport(rawPayload: string, parserVersion = SPORTS_IMPORT_PARSER_VERSION) {
  return createHash("sha256").update(parserVersion).update("\0").update(rawPayload).digest("hex");
}
