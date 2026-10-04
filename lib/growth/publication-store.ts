import { Prisma, type PrismaClient } from "@prisma/client";
import { assertContentTransition, type ContentStatus } from "../command-center/content-workflow";
import { assertManualConfirmable, manualDestinationGaps, validatePublishedAt, validatePublishedUrl, type SocialPlatform } from "./manual-publication";
import { withSerializableRetry } from "./tx";

export async function prepareManualHandoffTx(db: PrismaClient, input: { draftId: string; socialAccountId: string; plannedFor: Date | null; actorId: string | null }) {
  return db.$transaction(async (tx) => {
    const draft = await tx.contentDraft.findUnique({ where: { id: input.draftId }, include: { brandAngle: { select: { brandId: true } }, publication: true, approvals: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!draft) throw new Error("Content not found");
    if (draft.publication?.status === "PUBLISHED") throw new Error("This content is already PUBLISHED");
    if (draft.approvals[0]?.decision !== "APPROVED") throw new Error("Content needs a current approval before handoff");
    if (draft.status === "APPROVED") assertContentTransition(draft.status as ContentStatus, "READY");
    else if (draft.status !== "READY") throw new Error(`Only APPROVED content can be handed off (currently ${draft.status})`);
    const account = await tx.socialAccount.findUnique({ where: { id: input.socialAccountId } });
    if (!account) throw new Error("Destination account not found");
    const gaps = manualDestinationGaps(account, draft.brandAngle.brandId);
    if (gaps.length) throw new Error(`Destination is not ready for manual publishing: ${gaps.join("; ")}`);
    await tx.contentDraft.update({ where: { id: draft.id }, data: { status: "READY", socialAccountId: account.id, scheduledFor: input.plannedFor } });
    await tx.publication.upsert({
      where: { draftId: draft.id },
      update: { socialAccountId: account.id, scheduledFor: input.plannedFor, status: "READY", method: "MANUAL", failureReason: null },
      create: { draftId: draft.id, socialAccountId: account.id, scheduledFor: input.plannedFor, status: "READY", method: "MANUAL" },
    });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "content.manual_handoff", entityType: "ContentDraft", entityId: draft.id, metadata: { socialAccountId: account.id, platform: account.platform, plannedFor: input.plannedFor?.toISOString() ?? null } } });
  }, { isolationLevel: "Serializable" });
}

export type ConfirmResult = { outcome: "PUBLISHED" | "ALREADY_RECORDED"; publicationId: string };

/** Records an externally posted URL/time and marks Publication and ContentDraft PUBLISHED atomically. Repeats are blocked; an identical replay is a no-op. */
export async function confirmManualPublicationTx(db: PrismaClient, input: { draftId: string; platformUrl: string; publishedAt: Date | null; platformPostId: string | null; confirmationNote: string | null; actorId: string | null; now?: Date }): Promise<ConfirmResult> {
  const now = input.now ?? new Date();
  return withSerializableRetry(db, async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ContentDraft" WHERE "id" = ${input.draftId} FOR UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Publication" WHERE "draftId" = ${input.draftId} FOR UPDATE`);
    const draft = await tx.contentDraft.findUnique({ where: { id: input.draftId }, include: { brandAngle: { select: { brandId: true } }, publication: { include: { socialAccount: true } }, approvals: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!draft) throw new Error("Content not found");
    const publication = draft.publication;
    if (publication?.status === "PUBLISHED") {
      if (publication.platformUrl && publication.platformUrl === safeUrl(publication.socialAccount.platform as SocialPlatform, input.platformUrl)) return { outcome: "ALREADY_RECORDED", publicationId: publication.id };
      throw new Error("This content is already recorded as PUBLISHED with a different URL. Existing publication records are never reset.");
    }
    const latestApproval = draft.approvals[0] ?? null;
    assertManualConfirmable({ draftStatus: draft.status, latestApprovalDecision: latestApproval?.decision ?? null, latestApprovalAt: latestApproval?.createdAt ?? null, publication: publication ? { status: publication.status, method: publication.method } : null });
    if (!publication) throw new Error("Prepare a manual handoff before recording a publication");
    const gaps = manualDestinationGaps(publication.socialAccount, draft.brandAngle.brandId);
    if (gaps.length) throw new Error(`Destination is not valid for this content: ${gaps.join("; ")}`);
    const platformUrl = validatePublishedUrl(publication.socialAccount.platform as SocialPlatform, input.platformUrl);
    const publishedAt = validatePublishedAt(input.publishedAt, latestApproval?.createdAt ?? null, now);
    const updated = await tx.publication.update({ where: { id: publication.id }, data: { status: "PUBLISHED", publishedAt, platformUrl, platformPostId: input.platformPostId, confirmationNote: input.confirmationNote, recordedById: input.actorId, method: "MANUAL" } });
    await tx.contentDraft.update({ where: { id: draft.id }, data: { status: "PUBLISHED" } });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: "publication.manual_confirm", entityType: "Publication", entityId: publication.id, metadata: { draftId: draft.id, socialAccountId: publication.socialAccountId, platform: publication.socialAccount.platform, platformUrl, publishedAt: publishedAt.toISOString(), approvalId: latestApproval?.id ?? null } } });
    return { outcome: "PUBLISHED", publicationId: updated.id };
  });
}

function safeUrl(platform: SocialPlatform, raw: string) {
  try {
    return validatePublishedUrl(platform, raw);
  } catch {
    return null;
  }
}
