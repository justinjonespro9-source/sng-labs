import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const eventSchema = z.object({
  eventId: z.string().trim().min(1),
  season: z.number().int(),
  week: z.number().int().min(1),
  startsAt: z.string().trim().refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid ISO datetime"),
  timeValid: z.boolean(),
  statusName: z.string().trim().min(1),
  statusDetail: z.string(),
  homeTeamName: z.string().trim().min(1),
  homeTeamAbbr: z.string().trim().min(1),
  awayTeamName: z.string().trim().min(1),
  awayTeamAbbr: z.string().trim().min(1),
  venueName: z.string().trim().min(1),
  venueCity: z.string().trim().min(1),
  venueState: z.string().nullable(),
  venueCountry: z.string().trim().min(1),
  isNeutralSite: z.boolean(),
});

export const nflFixtureSchema = z.object({
  season: z.literal(2026),
  seasonType: z.literal("regular"),
  source: z.string().url(),
  fetchedAt: z.string().datetime({ offset: true }),
  events: z.array(eventSchema).length(272),
}).superRefine((fixture, context) => {
  const ids = new Set<string>();
  for (const event of fixture.events) {
    if (ids.has(event.eventId)) context.addIssue({ code: "custom", message: `Duplicate eventId: ${event.eventId}` });
    ids.add(event.eventId);
  }
});

export type NflFixture = z.infer<typeof nflFixtureSchema>;
export type NflFixtureEvent = NflFixture["events"][number];

export const NFL_FIXTURE_PATH = join(process.cwd(), "data/nfl/2026-regular-season.json");

export function loadNflFixture(path = NFL_FIXTURE_PATH): NflFixture {
  return nflFixtureSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}
