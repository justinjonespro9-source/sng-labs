import { z } from "zod";

const key = z.string().min(2).regex(/^[a-z0-9-]+$/);

export const sportsSchedulePackageSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.object({
    provider: z.string().min(2),
    label: z.string().min(2),
    reference: z.string().url(),
    publishedAt: z.string().datetime(),
    acquiredAt: z.string().datetime(),
    review: z.object({ reviewer: z.string().min(2), reviewedAt: z.string().datetime() }),
  }),
  sport: z.object({ key, code: z.string().min(2), name: z.string().min(2) }),
  league: z.object({ key, code: z.string().min(2), name: z.string().min(2), subdivision: z.string().min(1).optional() }),
  season: z.object({ year: z.number().int().min(2000), label: z.string().min(2) }),
  markets: z.array(z.object({ key, name: z.string().min(2), region: z.string().optional(), country: z.string().default("US") })),
  venues: z.array(z.object({ key, name: z.string().min(2), city: z.string().min(2), state: z.string().optional(), country: z.string().default("US"), timeZone: z.string().min(3), marketKey: key.optional(), externalId: z.string().min(1) })),
  teams: z.array(z.object({ key, name: z.string().min(2), abbreviation: z.string().min(2), marketKey: key, homeVenueKey: key.optional(), externalId: z.string().min(1) })),
  events: z.array(z.object({
    externalId: z.string().min(1),
    homeTeamKey: key,
    awayTeamKey: key,
    venueKey: key,
    startsAt: z.string().datetime(),
    timeTbd: z.boolean().default(false),
    neutralSite: z.boolean().default(false),
    status: z.enum(["SCHEDULED", "TIME_TBD", "POSTPONED", "CANCELLED", "LIVE", "FINAL"]),
    week: z.number().int().positive().optional(),
    sourceStatus: z.string().optional(),
  })),
});

export type SportsSchedulePackage = z.infer<typeof sportsSchedulePackageSchema>;
