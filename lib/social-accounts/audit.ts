import type { Prisma, PrismaClient } from "@prisma/client";
import { assertNoSecretMaterial, redactSocialSecrets } from "./redaction";

export const socialAuditActions = [
  "social_account.inventory.create",
  "social_account.inventory.update",
  "social_account.identity.verify",
  "social_authorization.started",
  "social_authorization.connected",
  "social_authorization.failed",
  "social_authorization.refreshed",
  "social_authorization.revoked",
  "social_account.discovered",
  "social_capability.snapshot",
  "social_health.observed",
] as const;

export type SocialAuditAction = (typeof socialAuditActions)[number];

export async function writeSocialAuditEvent(prisma: PrismaClient | Prisma.TransactionClient, input: {
  actorId?: string | null;
  action: SocialAuditAction;
  entityType: string;
  entityId?: string | null;
  requestId?: string;
  metadata?: Record<string, unknown>;
}) {
  const metadata = redactSocialSecrets({ requestId: input.requestId, ...input.metadata });
  assertNoSecretMaterial(metadata);
  return prisma.auditEvent.create({ data: {
    actorId: input.actorId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: metadata as Prisma.InputJsonValue,
  } });
}

