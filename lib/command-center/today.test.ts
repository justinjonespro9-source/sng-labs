import { describe, expect, it } from "vitest";
import { dedupeOpenSocialHealth, orderTodayItems, type TodayItem } from "./today";

describe("Today read model", () => {
  it("orders heterogeneous items without merging their source identities", () => {
    const items = [
      { id: "PUBLICATION:1", sourceType: "PUBLICATION", sourceId: "1", title: "Post", startsAt: "2026-10-01T02:00:00.000Z", status: "PLANNED", href: "/queue", lenses: ["DISTRIBUTION"] },
      { id: "GROWTH_EVENT:1", sourceType: "GROWTH_EVENT", sourceId: "1", title: "Game", startsAt: "2026-10-01T01:00:00.000Z", status: "SCHEDULED", href: "/event", lenses: ["SPORTS"] },
    ] as TodayItem[];
    expect(orderTodayItems(items).map((item) => item.id)).toEqual(["GROWTH_EVENT:1", "PUBLICATION:1"]);
    expect(new Set(items.map((item) => item.sourceType)).size).toBe(2);
  });

  it("deduplicates open Social Account actions using the latest observation", () => {
    const items = dedupeOpenSocialHealth([
      { id: "old", dedupeKey: "account:reauth", observedAt: new Date("2026-09-24T10:00:00Z") },
      { id: "new", dedupeKey: "account:reauth", observedAt: new Date("2026-09-24T11:00:00Z") },
      { id: "scope", dedupeKey: "account:scope", observedAt: new Date("2026-09-24T09:00:00Z") },
    ]);
    expect(items.map((item) => item.id).sort()).toEqual(["new", "scope"]);
  });
});
