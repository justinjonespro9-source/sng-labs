import { createHash } from "node:crypto";
import { z } from "zod";

export const SPORTS_IMPORT_PARSER_VERSION = "sports-v1a-1";

export const rosterRowSchema = z.object({
  provider: z.string().trim().min(1),
  externalId: z.string().trim().min(1),
  canonicalName: z.string().trim().min(1),
  aliases: z.array(z.string().trim().min(1)).default([]),
  teamAbbreviation: z.string().trim().toUpperCase().min(2).max(4),
  fantasyPosition: z.enum(["QB", "RB", "WR", "TE"]),
  sourcePosition: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "PRACTICE_SQUAD", "INJURED_RESERVE", "PUP", "SUSPENDED", "INACTIVE", "FREE_AGENT", "OTHER"]).default("ACTIVE"),
  active: z.boolean().default(true),
  jerseyNumber: z.number().int().min(0).max(99).optional(),
});

export const rosterPayloadSchema = z.object({
  league: z.literal("NFL"),
  year: z.literal(2026),
  sourceLabel: z.string().trim().min(1),
  sourceReference: z.string().trim().optional(),
  rows: z.array(rosterRowSchema).min(1),
});

export type RosterPayload = z.infer<typeof rosterPayloadSchema>;

export function checksumImport(rawPayload: string) {
  return createHash("sha256").update(rawPayload).digest("hex");
}
