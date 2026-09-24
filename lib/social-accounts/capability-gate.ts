import type { PrismaClient, SocialCapability } from "@prisma/client";
import { publishingCapabilities, type CapabilityGateDecision, type CapabilityGateInput } from "./types";

export function decideSocialCapability(input: CapabilityGateInput): CapabilityGateDecision {
  const account = input.account;
  if (!account) return { allowed: false, reasonCode: "ACCOUNT_UNKNOWN" };
  if (account.brandId !== input.requestedBrandId) return { allowed: false, reasonCode: "BRAND_MISMATCH", socialAccountId: account.id };
  if (account.lifecycleStatus === "DISABLED" || account.lifecycleStatus === "INACTIVE") return { allowed: false, reasonCode: "ACCOUNT_DISABLED", socialAccountId: account.id };
  if (publishingCapabilities.has(input.capability) && !account.publishingEnabled) return { allowed: false, reasonCode: "PUBLISHING_DISABLED", socialAccountId: account.id };

  const link = input.authorizationAccount;
  if (!link || link.status !== "VERIFIED") return { allowed: false, reasonCode: "AUTHORIZATION_ACCOUNT_UNVERIFIED", socialAccountId: account.id };
  if (link.authorization.status === "REAUTHORIZATION_REQUIRED") return { allowed: false, reasonCode: "REAUTHORIZATION_REQUIRED", socialAccountId: account.id };
  if (link.authorization.status === "EXPIRED" || (link.authorization.expiresAt && link.authorization.expiresAt <= input.now)) return { allowed: false, reasonCode: "AUTHORIZATION_EXPIRED", socialAccountId: account.id };
  if (link.authorization.status !== "CONNECTED") return { allowed: false, reasonCode: "AUTHORIZATION_INVALID", socialAccountId: account.id };
  if (!input.vaultAvailable) return { allowed: false, reasonCode: "VAULT_UNAVAILABLE", socialAccountId: account.id };
  if (!link.authorization.accessCredentialRef) return { allowed: false, reasonCode: "CREDENTIAL_REFERENCE_MISSING", socialAccountId: account.id };

  const granted = new Set(link.authorization.grantedScopes);
  if (input.requiredScopes.some((scope) => !granted.has(scope))) return { allowed: false, reasonCode: "SCOPE_MISSING", socialAccountId: account.id };
  if (!input.snapshot || !input.snapshot.result) return { allowed: false, reasonCode: "CAPABILITY_UNVERIFIED", socialAccountId: account.id };
  if (input.snapshot.validUntil <= input.now) return { allowed: false, reasonCode: "CAPABILITY_STALE", socialAccountId: account.id };
  if (input.snapshot.result.state !== "SUPPORTED") return { allowed: false, reasonCode: "CAPABILITY_BLOCKED", socialAccountId: account.id };

  return { allowed: true, socialAccountId: account.id, authorizationAccountId: link.id, capabilitySnapshotId: input.snapshot.id };
}

export async function authorizeSocialCapability(
  prisma: PrismaClient,
  input: { brandId: string; socialAccountId: string; capability: SocialCapability; now?: Date; vaultAvailable: boolean; requiredScopes: string[] },
) {
  const now = input.now ?? new Date();
  const account = await prisma.socialAccount.findUnique({
    where: { id: input.socialAccountId },
    select: {
      id: true, brandId: true, platform: true, lifecycleStatus: true, publishingEnabled: true,
      authorizationLinks: {
        where: { status: "VERIFIED" },
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: { id: true, status: true, authorization: { select: { id: true, status: true, grantedScopes: true, accessCredentialRef: true, expiresAt: true } } },
      },
      capabilitySnapshots: {
        where: { results: { some: { capability: input.capability } } },
        orderBy: { verifiedAt: "desc" },
        take: 1,
        select: { id: true, validUntil: true, results: { where: { capability: input.capability }, select: { state: true }, take: 1 } },
      },
    },
  });
  const link = account?.authorizationLinks[0] ?? null;
  const snapshot = account?.capabilitySnapshots[0] ?? null;
  return decideSocialCapability({
    requestedBrandId: input.brandId,
    capability: input.capability,
    now,
    vaultAvailable: input.vaultAvailable,
    account: account ? { id: account.id, brandId: account.brandId, platform: account.platform, lifecycleStatus: account.lifecycleStatus, publishingEnabled: account.publishingEnabled } : null,
    authorizationAccount: link,
    requiredScopes: input.requiredScopes,
    snapshot: snapshot ? { id: snapshot.id, validUntil: snapshot.validUntil, result: snapshot.results[0] ?? null } : null,
  });
}

