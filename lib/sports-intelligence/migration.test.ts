import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Sports Intelligence V2 migration safety", () => {
  const sql = readFileSync(resolve(process.cwd(), "prisma/migrations/20260924150000_sports_intelligence_v2_foundation/migration.sql"), "utf8");
  const subdivisionSql = readFileSync(resolve(process.cwd(), "prisma/migrations/20260924170000_sports_intelligence_v2_team_subdivision/migration.sql"), "utf8");

  it("is additive and preserves factual/scoring tables", () => {
    expect(sql).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);
    expect(sql).not.toMatch(/ALTER TABLE "Nfl(Player|Defense)EventStat"/);
    expect(sql).not.toMatch(/ALTER TABLE "Sports(DerivedPerformance|ScoringInputSnapshot|WeeklyResult)/);
    expect(subdivisionSql).not.toMatch(/DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);
    expect(subdivisionSql).toContain('ALTER TABLE "Team" ADD COLUMN "subdivision" TEXT');
  });

  it("enforces exactly one relevance target and matching scope", () => {
    expect(sql).toContain("BrandSportsRelevance_exactly_one_target_check");
    expect(sql).toContain("BrandSportsRelevance_scope_target_check");
  });
});
