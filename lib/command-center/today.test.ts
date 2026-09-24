import { describe, expect, it } from "vitest";
import { orderTodayItems, type TodayItem } from "./today";

describe("Today read model", () => {
  it("orders heterogeneous items without merging their source identities", () => {
    const items = [
      { id: "PUBLICATION:1", sourceType: "PUBLICATION", sourceId: "1", title: "Post", startsAt: "2026-10-01T02:00:00.000Z", status: "PLANNED", href: "/queue", lenses: ["DISTRIBUTION"] },
      { id: "GROWTH_EVENT:1", sourceType: "GROWTH_EVENT", sourceId: "1", title: "Game", startsAt: "2026-10-01T01:00:00.000Z", status: "SCHEDULED", href: "/event", lenses: ["SPORTS"] },
    ] as TodayItem[];
    expect(orderTodayItems(items).map((item) => item.id)).toEqual(["GROWTH_EVENT:1", "PUBLICATION:1"]);
    expect(new Set(items.map((item) => item.sourceType)).size).toBe(2);
  });
});
