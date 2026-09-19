import { describe, expect, it, vi } from "vitest";
import { seedSportsIdentityFoundation } from "./seed-foundation";

describe("sports identity foundation seed", () => {
  it("preserves existing team-defense identities and only creates missing ones", async () => {
    const create = vi.fn().mockResolvedValue({ id: "participant-phi" });
    const prisma = {
      sportsSeason: {
        upsert: vi.fn().mockResolvedValue({ id: "nfl-2026" }),
      },
      team: {
        findMany: vi.fn().mockResolvedValue([
          { id: "min", key: "minnesota-vikings", name: "Minnesota Vikings" },
          { id: "phi", key: "philadelphia-eagles", name: "Philadelphia Eagles" },
        ]),
      },
      teamDefense: {
        findUnique: vi.fn().mockImplementation(({ where }) =>
          Promise.resolve(where.teamId === "min" ? { id: "existing-min" } : null),
        ),
        count: vi.fn().mockResolvedValue(2),
      },
      sportsParticipant: { create },
    };

    const result = await seedSportsIdentityFoundation(prisma as never);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "TEAM_DEFENSE",
          canonicalName: "Philadelphia Eagles D/ST",
        }),
      }),
    );
    expect(result).toMatchObject({ teamCount: 2, defenseCount: 2 });
  });
});
