import { describe, expect, it } from "vitest";
import { activeMembershipDeactivationWhere, membershipsToDeactivate } from "./roster-history";

describe("season roster history", () => {
  it("deactivates the prior active team membership without deleting it", () => {
    const prior = {
      seasonId: "nfl-2026",
      participantId: "player-1",
      teamId: "min",
      active: true,
    };
    const next = { ...prior, teamId: "phi" };

    expect(membershipsToDeactivate([prior], next)).toEqual([prior]);
  });

  it("builds the exact non-destructive update scope used by ingestion", () => {
    expect(
      activeMembershipDeactivationWhere({
        seasonId: "nfl-2026",
        participantId: "player-1",
        teamId: "phi",
        active: true,
      }),
    ).toEqual({
      seasonId: "nfl-2026",
      participantId: "player-1",
      teamId: { not: "phi" },
      active: true,
    });
  });

  it("does not alter historical seasons or other participants", () => {
    const next = {
      seasonId: "nfl-2026",
      participantId: "player-1",
      teamId: "phi",
      active: true,
    };
    const memberships = [
      { ...next, seasonId: "nfl-2025", teamId: "min" },
      { ...next, participantId: "player-2", teamId: "min" },
    ];

    expect(membershipsToDeactivate(memberships, next)).toEqual([]);
  });
});
