import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("prisma/migrations/20261001120000_growth_os_v1/migration.sql", "utf8");
const statements = sql.split(";").map((statement) => statement.replace(/--[^\n]*/g, "").trim()).filter(Boolean);

describe("Growth OS V1 migration", () => {
  it("is additive only: no drops, renames, deletes, truncation or tightened columns", () => {
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bRENAME\b/i);
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toMatch(/SET\s+NOT\s+NULL/i);
    expect(sql).not.toMatch(/ALTER\s+COLUMN/i);
    expect(sql).not.toMatch(/^\s*UPDATE\s/im);
  });

  it("adds existing-table columns as nullable without defaults that rewrite history", () => {
    const addColumns = statements.filter((statement) => /^ALTER TABLE "(Publication|Campaign|Relationship|RelationshipActivity)"\s+ADD COLUMN/i.test(statement));
    expect(addColumns.length).toBeGreaterThan(0);
    for (const statement of addColumns) for (const clause of statement.split(/ADD COLUMN/i).slice(1)) expect(clause).not.toMatch(/NOT NULL/i);
  });

  it("creates the Growth OS tables and one-CURRENT partial unique indexes", () => {
    for (const table of ["BrandGrowthBrief", "BrandPortfolioPriority", "CampaignTarget", "CampaignReview", "GrowthMetricDefinition", "GrowthMeasurement", "GrowthAction", "RelationshipCampaign"]) expect(sql).toContain(`CREATE TABLE "${table}"`);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "BrandGrowthBrief_one_current_per_brand"[\s\S]*?WHERE "status" = 'CURRENT'/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "BrandPortfolioPriority_one_current_per_brand"[\s\S]*?WHERE "status" = 'CURRENT'/);
    expect(sql).toContain(`CHECK (("status" = 'UNKNOWN') = ("value" IS NULL))`);
  });

  it("backfills relationship campaign links only from existing campaignId, idempotently", () => {
    const inserts = statements.filter((statement) => /^INSERT\s+INTO/i.test(statement));
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatch(/^INSERT INTO "RelationshipCampaign"/);
    expect(inserts[0]).toContain(`WHERE "campaignId" IS NOT NULL`);
    expect(inserts[0]).toMatch(/ON CONFLICT DO NOTHING$/);
  });

  it("does not touch canonical sports, scoring or social authorization tables", () => {
    expect(sql).not.toMatch(/"(Sports[A-Za-z]*|Canonical[A-Za-z]*|Score[A-Za-z]*|SocialAuthorization[A-Za-z]*|GrowthEvent)"\s*(ADD|DROP|ALTER)/);
    expect(sql).not.toMatch(/ALTER TABLE "(Sports[A-Za-z]*|Canonical[A-Za-z]*|GrowthEvent|SocialAccount|SocialAuthorization[A-Za-z]*)"\s+(ADD|ALTER|DROP)\s+(COLUMN|CONSTRAINT)/);
  });
});
