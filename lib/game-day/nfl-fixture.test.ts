import { describe, expect, it } from "vitest";
import { buildNflImportPlan, importNflSchedule, mapFixtureStatus } from "./nfl-import";
import { nflTeams, nflVenues, resolveNflTeam, resolveNflVenue } from "./nfl-foundation";
import { loadNflFixture } from "./nfl-fixture";

describe("audited NFL 2026 fixture", () => {
  it("contains the complete canonical regular season and resolves every identity", () => {
    const fixture = loadNflFixture();
    const plan = buildNflImportPlan(fixture);
    expect(fixture.events).toHaveLength(272);
    expect(new Set(fixture.events.flatMap((event) => [event.homeTeamName, event.awayTeamName])).size).toBe(32);
    expect(new Set(fixture.events.map((event) => event.venueName)).size).toBe(38);
    expect(fixture.events.filter((event) => event.isNeutralSite)).toHaveLength(9);
    expect(nflTeams).toHaveLength(32);
    expect(nflVenues).toHaveLength(38);
    expect(plan.unresolved).toEqual([]);
    expect(plan.mapped).toHaveLength(272);
    expect(plan.mapped.every((event) => event.startsAt instanceof Date && !Number.isNaN(event.startsAt.getTime()))).toBe(true);
  });

  it("uses explicit stable team and venue aliases", () => {
    expect(resolveNflTeam("Minnesota Vikings")?.key).toBe("minnesota-vikings");
    expect(resolveNflTeam("Philadelphia Eagles")?.key).toBe("philadelphia-eagles");
    expect(resolveNflVenue("U.S. Bank Stadium")?.key).toBe("u-s-bank-stadium");
    expect(resolveNflTeam("Invented Team")).toBeNull();
    expect(resolveNflVenue("Invented Stadium")).toBeNull();
  });

  it("maps source status without inventing game state", () => {
    expect(mapFixtureStatus({ statusName: "STATUS_SCHEDULED", timeValid: true })).toBe("SCHEDULED");
    expect(mapFixtureStatus({ statusName: "STATUS_SCHEDULED", timeValid: false })).toBe("TIME_TBD");
    expect(mapFixtureStatus({ statusName: "STATUS_POSTPONED", timeValid: true })).toBe("POSTPONED");
    expect(mapFixtureStatus({ statusName: "STATUS_FINAL", timeValid: true })).toBe("FINAL");
  });

  it("performs a dry run using reads only", async () => {
    const failWrite = () => { throw new Error("dry run attempted a write"); };
    const fake = {
      market: { findMany: async () => [], findUnique: async () => null, create: failWrite },
      venue: { findMany: async () => [], findUnique: async () => null, create: failWrite, update: failWrite },
      team: { findMany: async () => [], findUnique: async () => null, create: failWrite, update: failWrite },
      growthEvent: { findMany: async () => [], count: async () => 0, create: failWrite, update: failWrite },
      auditEvent: { create: failWrite },
    };
    const result = await importNflSchedule(fake as never, loadNflFixture(), { apply: false });
    expect(result.dryRun).toBe(true);
    expect(result.fixtureEvents).toBe(272);
    expect(result.created).toBe(272);
    expect(result.updated).toBe(0);
    expect(result.unresolved).toEqual([]);
  });
});
