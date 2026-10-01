import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { BriefContent } from "./briefs";
import { EXACTSTAT_KEY, initializeExactStat } from "./exactstat";
import { confirmManualPublicationTx, prepareManualHandoffTx } from "./publication-store";
import { approveGrowthBrief, createGrowthBriefDraft } from "./strategy-store";

const url = process.env.GROWTH_OS_INTEGRATION_DATABASE_URL;

function assertLocalDatabase(raw: string) {
  const parsed = new URL(raw);
  if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || /neon|vercel|ep-[a-z]+-[a-z]+-/i.test(raw)) throw new Error("GROWTH_OS_INTEGRATION_DATABASE_URL must point at a local, isolated database");
}

const tag = `itest-${randomUUID().slice(0, 8)}`;
const content = (overrides: Partial<BriefContent> = {}): BriefContent => ({ stage: "VALIDATION", priorityAudience: "Fantasy commissioners", marketId: null, geographyNotes: null, offer: "Free league rankings", activationDefinition: "Saved first ranking", repeatDefinition: null, bottleneck: "Awareness", primaryMotion: "Commissioner outreach", capacityNotes: null, effectiveAt: new Date("2026-09-01T05:00:00Z"), reviewAt: new Date("2026-12-01T06:00:00Z"), notes: tag, ...overrides });

describe.skipIf(!url)("Growth OS database integration (local isolated DB only)", () => {
  let db: PrismaClient;
  const ids: { brandId?: string; userId?: string; organizationId?: string; campaignId?: string } = {};

  beforeAll(async () => {
    assertLocalDatabase(url!);
    db = new PrismaClient({ datasourceUrl: url });
    const brand = await db.brand.create({ data: { key: tag, name: `Integration ${tag}`, kind: "PRODUCT", description: "Integration fixture", audience: "Test", voice: "Test", callToActionRules: "Test", visualDirection: "Test", defaultCadenceNotes: "Test", active: false } });
    const user = await db.user.create({ data: { email: `${tag}@example.invalid`, role: "EDITOR" } });
    ids.brandId = brand.id;
    ids.userId = user.id;
  });

  afterAll(async () => {
    if (!db) return;
    if (ids.brandId) {
      const angles = await db.brandAngle.findMany({ where: { brandId: ids.brandId }, select: { id: true, opportunityId: true } });
      const drafts = await db.contentDraft.findMany({ where: { brandAngleId: { in: angles.map((angle) => angle.id) } }, select: { id: true } });
      await db.publication.deleteMany({ where: { draftId: { in: drafts.map((draft) => draft.id) } } });
      await db.approval.deleteMany({ where: { draftId: { in: drafts.map((draft) => draft.id) } } });
      await db.contentDraft.deleteMany({ where: { id: { in: drafts.map((draft) => draft.id) } } });
      await db.brandAngle.deleteMany({ where: { brandId: ids.brandId } });
      await db.opportunity.deleteMany({ where: { id: { in: angles.map((angle) => angle.opportunityId) } } });
      await db.socialAccount.deleteMany({ where: { brandId: ids.brandId } });
      await db.brandGrowthBrief.updateMany({ where: { brandId: ids.brandId }, data: { supersedesId: null } });
      await db.brandGrowthBrief.deleteMany({ where: { brandId: ids.brandId } });
    }
    if (ids.organizationId) {
      await db.relationship.deleteMany({ where: { organizationId: ids.organizationId } });
      await db.organization.delete({ where: { id: ids.organizationId } });
    }
    if (ids.campaignId) await db.campaign.delete({ where: { id: ids.campaignId } });
    if (ids.brandId) await db.brand.delete({ where: { id: ids.brandId } });
    if (ids.userId) await db.user.delete({ where: { id: ids.userId } });
    await db.$disconnect();
  });

  it("keeps exactly one CURRENT brief when two drafts are approved concurrently", async () => {
    const first = await createGrowthBriefDraft(db, { brandId: ids.brandId!, actorId: null, content: content() });
    const second = await createGrowthBriefDraft(db, { brandId: ids.brandId!, actorId: null, content: content({ offer: "Beta invite" }) });
    const results = await Promise.allSettled([approveGrowthBrief(db, { briefId: first.id, actorId: null }), approveGrowthBrief(db, { briefId: second.id, actorId: null })]);
    expect(results.filter((result) => result.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
    const briefs = await db.brandGrowthBrief.findMany({ where: { brandId: ids.brandId } });
    const current = briefs.filter((brief) => brief.status === "CURRENT");
    expect(current).toHaveLength(1);
    if (results.every((result) => result.status === "fulfilled")) {
      const superseded = briefs.find((brief) => brief.status === "SUPERSEDED");
      expect(superseded).toBeDefined();
      expect(current[0].supersedesId).toBe(superseded!.id);
    }
  });

  it("rejects a second CURRENT brief at the database level", async () => {
    const draft = await createGrowthBriefDraft(db, { brandId: ids.brandId!, actorId: null, content: content() });
    await expect(db.brandGrowthBrief.update({ where: { id: draft.id }, data: { status: "CURRENT" } })).rejects.toThrow();
  });

  it("initializes ExactStat idempotently, even concurrently", async () => {
    await Promise.allSettled([initializeExactStat(db), initializeExactStat(db)]);
    await initializeExactStat(db);
    const brands = await db.brand.findMany({ where: { key: EXACTSTAT_KEY }, include: { growthBriefs: true } });
    expect(brands).toHaveLength(1);
    expect(brands[0].brandBrainVersion).not.toBeNull();
    expect(brands[0].growthBriefs.filter((brief) => brief.revision === 1)).toHaveLength(1);
    expect(brands[0].growthBriefs.some((brief) => brief.status === "CURRENT")).toBe(false);
  });

  it("re-running the relationship campaign backfill is idempotent", async () => {
    const campaign = await db.campaign.create({ data: { name: `Campaign ${tag}` } });
    const organization = await db.organization.create({ data: { name: `Org ${tag}`, type: "OTHER" } });
    ids.campaignId = campaign.id;
    ids.organizationId = organization.id;
    const relationship = await db.relationship.create({ data: { name: `Rel ${tag}`, organizationId: organization.id, campaignId: campaign.id } });
    const backfill = readFileSync("prisma/migrations/20261001120000_growth_os_v1/migration.sql", "utf8").match(/INSERT INTO "RelationshipCampaign"[\s\S]*?ON CONFLICT DO NOTHING;/)![0];
    await db.$executeRawUnsafe(backfill);
    await db.$executeRawUnsafe(backfill);
    const links = await db.relationshipCampaign.findMany({ where: { relationshipId: relationship.id } });
    expect(links).toEqual([expect.objectContaining({ campaignId: campaign.id, source: "LEGACY_CAMPAIGN_ID" })]);
  });

  it("records one PUBLISHED publication when manual confirmation is submitted concurrently", async () => {
    const account = await db.socialAccount.create({ data: { brandId: ids.brandId!, platform: "X", handle: "sngintegration", profileUrl: "https://x.com/sngintegration", metadataVerifiedAt: new Date(Date.now() - 3_600_000), lifecycleStatus: "KNOWN" } });
    const opportunity = await db.opportunity.create({ data: { title: `Opp ${tag}`, summary: "Integration" } });
    const angle = await db.brandAngle.create({ data: { opportunityId: opportunity.id, brandId: ids.brandId!, objective: "o", hook: "h", rationale: "r" } });
    const draft = await db.contentDraft.create({ data: { brandAngleId: angle.id, objective: "o", hook: "h", rationale: "r", body: "Integration copy", status: "APPROVED" } });
    await db.approval.create({ data: { draftId: draft.id, reviewerId: ids.userId!, decision: "APPROVED", createdAt: new Date(Date.now() - 1_800_000) } });
    await prepareManualHandoffTx(db, { draftId: draft.id, socialAccountId: account.id, plannedFor: null, actorId: null });
    const confirm = () => confirmManualPublicationTx(db, { draftId: draft.id, platformUrl: "https://x.com/sngintegration/status/1234567890", publishedAt: new Date(Date.now() - 60_000), platformPostId: null, confirmationNote: null, actorId: null });
    const results = await Promise.allSettled([confirm(), confirm(), confirm()]);
    const outcomes = results.flatMap((result) => (result.status === "fulfilled" ? [result.value.outcome] : []));
    expect(outcomes.filter((outcome) => outcome === "PUBLISHED")).toHaveLength(1);
    const publication = await db.publication.findUniqueOrThrow({ where: { draftId: draft.id } });
    expect(publication.status).toBe("PUBLISHED");
    expect((await db.contentDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe("PUBLISHED");
    expect(await db.auditEvent.count({ where: { action: "publication.manual_confirm", entityId: publication.id } })).toBe(1);
    expect((await confirm()).outcome).toBe("ALREADY_RECORDED");
    await expect(confirmManualPublicationTx(db, { draftId: draft.id, platformUrl: "https://x.com/sngintegration/status/999", publishedAt: null, platformPostId: null, confirmationNote: null, actorId: null })).rejects.toThrow(/never reset/);
  });
});
