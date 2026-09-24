import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("prisma/migrations/20260925140000_social_accounts_v1_foundation/migration.sql", "utf8");
describe("Social Accounts V1 migration", () => {
  it("removes the one-account-per-brand-platform constraint and preserves inventory without fabricating identity", () => {
    expect(sql).toContain('DROP INDEX IF EXISTS "SocialAccount_brandId_platform_key"');
    expect(sql).toContain('SET "connectionStatus" = \'NOT_CONNECTED\'');
    expect(sql).not.toMatch(/SET\s+"externalAccountId"\s*=/);
  });
  it("adds identity, authorization, capability and objective health structures", () => {
    for (const table of ["SocialPlatformApplication", "SocialAuthorization", "SocialAuthorizationAccount", "SocialCapabilitySnapshot", "SocialCapabilityResult", "SocialConnectionHealthObservation"]) expect(sql).toContain(`CREATE TABLE "${table}"`);
    expect(sql).toContain("SocialConnectionHealthObservation_open_dedupe_key");
  });
});

