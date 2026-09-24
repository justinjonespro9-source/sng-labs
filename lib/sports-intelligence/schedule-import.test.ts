import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { applyScheduleRun, schedulePackageChecksum, stableJson, validateSchedulePackage } from "./schedule-import";

function fixture(name: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), "data/sports-intelligence", name), "utf8")) as Record<string, unknown>;
}

describe("Sports Intelligence schedule packages", () => {
  it.each([
    ["2026-minnesota-ncaaf-home-schedule.json", "NCAAF", 7],
    ["2026-27-minnesota-nba-opening-home.json", "NBA", 3],
    ["2026-27-minnesota-nhl-opener.json", "NHL", 1],
  ])("validates %s as operator-reviewed immutable source input", (file, league, eventCount) => {
    const parsed = validateSchedulePackage(fixture(file));
    expect(parsed.league.code).toBe(league);
    expect(parsed.events).toHaveLength(eventCount);
    expect(parsed.source.review.reviewedAt).toBeTruthy();
    expect(parsed.source.reference).toMatch(/^https:\/\//);
  });

  it("produces stable checksums independent of object key order", () => {
    expect(stableJson({ b: 2, a: 1 })).toBe(stableJson({ a: 1, b: 2 }));
    expect(schedulePackageChecksum({ b: 2, a: 1 })).toBe(schedulePackageChecksum({ a: 1, b: 2 }));
  });

  it("fails closed when an event has an unresolved identity", () => {
    const input = fixture("2026-27-minnesota-nhl-opener.json");
    const events = input.events as Record<string, unknown>[];
    events[0] = { ...events[0], awayTeamKey: "unknown-team" };
    expect(() => validateSchedulePackage(input)).toThrow("Unresolved away team");
  });

  it("fails closed when TIME_TBD semantics disagree", () => {
    const input = fixture("2026-minnesota-ncaaf-home-schedule.json");
    const events = input.events as Record<string, unknown>[];
    events[4] = { ...events[4], timeTbd: false };
    expect(() => validateSchedulePackage(input)).toThrow("timeTbd/status mismatch");
  });

  it("preserves NCAAF program subdivision without changing the canonical league", () => {
    const parsed = validateSchedulePackage(fixture("2026-minnesota-ncaaf-home-schedule.json"));
    expect(parsed.league.code).toBe("NCAAF");
    expect(parsed.teams.find((team) => team.key === "minnesota-golden-gophers-football")?.subdivision).toBe("FBS");
    expect(parsed.teams.find((team) => team.key === "eastern-illinois-panthers-football")?.subdivision).toBe("FCS");
  });

  it("reuses an already applied schedule run without opening a write transaction", async () => {
    const transaction = vi.fn();
    const prisma = {
      sportsIngestionRun: { findUnique: vi.fn().mockResolvedValue({ id: "run-1", type: "SCHEDULE", status: "APPLIED" }) },
      $transaction: transaction,
    } as unknown as PrismaClient;

    await expect(applyScheduleRun(prisma, "run-1")).resolves.toEqual({ runId: "run-1", reused: true });
    expect(transaction).not.toHaveBeenCalled();
  });
});
