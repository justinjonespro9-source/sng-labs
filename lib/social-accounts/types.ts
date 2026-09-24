import type {
  SocialAccountLifecycleStatus,
  SocialAuthorizationAccountStatus,
  SocialAuthorizationStatus,
  SocialCapability,
  SocialCapabilityState,
  SocialPlatform,
} from "@prisma/client";

export const socialCapabilityDecisionReasonCodes = [
  "ACCOUNT_UNKNOWN",
  "BRAND_MISMATCH",
  "ACCOUNT_DISABLED",
  "PUBLISHING_DISABLED",
  "AUTHORIZATION_ACCOUNT_UNVERIFIED",
  "AUTHORIZATION_INVALID",
  "AUTHORIZATION_EXPIRED",
  "REAUTHORIZATION_REQUIRED",
  "SCOPE_MISSING",
  "CAPABILITY_UNVERIFIED",
  "CAPABILITY_STALE",
  "CAPABILITY_BLOCKED",
  "VAULT_UNAVAILABLE",
  "CREDENTIAL_REFERENCE_MISSING",
  "PLATFORM_UNAVAILABLE",
] as const;

export type SocialCapabilityDecisionReasonCode = (typeof socialCapabilityDecisionReasonCodes)[number];

export type CapabilityGateInput = {
  requestedBrandId: string;
  capability: SocialCapability;
  now: Date;
  vaultAvailable: boolean;
  account: null | {
    id: string;
    brandId: string;
    platform: SocialPlatform;
    lifecycleStatus: SocialAccountLifecycleStatus;
    publishingEnabled: boolean;
  };
  authorizationAccount: null | {
    id: string;
    status: SocialAuthorizationAccountStatus;
    authorization: {
      id: string;
      status: SocialAuthorizationStatus;
      grantedScopes: string[];
      accessCredentialRef: string | null;
      expiresAt: Date | null;
    };
  };
  requiredScopes: string[];
  snapshot: null | {
    id: string;
    validUntil: Date;
    result: null | { state: SocialCapabilityState };
  };
};

export type CapabilityGateDecision =
  | {
      allowed: true;
      socialAccountId: string;
      authorizationAccountId: string;
      capabilitySnapshotId: string;
    }
  | {
      allowed: false;
      reasonCode: SocialCapabilityDecisionReasonCode;
      socialAccountId?: string;
    };

export const publishingCapabilities = new Set<SocialCapability>([
  "PUBLISH_TEXT",
  "PUBLISH_IMAGE",
  "PUBLISH_VIDEO",
  "PUBLISH_MULTI_POST",
]);

