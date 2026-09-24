ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS 'DISCORD';

CREATE TYPE "SocialAccountType" AS ENUM ('UNKNOWN', 'PROFILE', 'PAGE', 'PROFESSIONAL_ACCOUNT', 'GUILD', 'CHANNEL', 'WEBHOOK_DESTINATION', 'OTHER');
CREATE TYPE "SocialAccountLifecycleStatus" AS ENUM ('KNOWN', 'ACTIVE', 'INACTIVE', 'DISABLED');
CREATE TYPE "SocialPlatformApplicationEnvironment" AS ENUM ('PREVIEW', 'PRODUCTION');
CREATE TYPE "SocialPlatformApplicationStatus" AS ENUM ('DISABLED', 'CONFIGURED', 'RETIRED');
CREATE TYPE "SocialAuthorizationStatus" AS ENUM ('NOT_CONNECTED', 'PENDING', 'CONNECTED', 'EXPIRED', 'REAUTHORIZATION_REQUIRED', 'REVOKED', 'ERROR', 'DISABLED');
CREATE TYPE "SocialAuthorizationAccountStatus" AS ENUM ('DISCOVERED', 'VERIFIED', 'INACCESSIBLE', 'DISABLED');
CREATE TYPE "SocialCapability" AS ENUM ('READ_PROFILE', 'PUBLISH_TEXT', 'PUBLISH_IMAGE', 'PUBLISH_VIDEO', 'PUBLISH_MULTI_POST', 'READ_PUBLICATION', 'READ_ANALYTICS', 'READ_REPLIES', 'MANAGE_COMMUNITY', 'RECEIVE_WEBHOOK_EVENTS');
CREATE TYPE "SocialCapabilityState" AS ENUM ('SUPPORTED', 'UNSUPPORTED', 'UNVERIFIED', 'BLOCKED');
CREATE TYPE "SocialConnectionHealthState" AS ENUM ('HEALTHY', 'WATCH', 'AT_RISK', 'DISCONNECTED', 'REAUTHORIZATION_REQUIRED', 'PERMISSION_MISSING', 'API_ERROR', 'DISABLED', 'UNKNOWN');
CREATE TYPE "SocialConnectionHealthSignal" AS ENUM ('AUTHORIZATION_VALID', 'AUTHORIZATION_EXPIRED', 'REFRESH_SUCCEEDED', 'REFRESH_FAILED', 'PERMISSION_LOST', 'ACCOUNT_INACCESSIBLE', 'API_REQUEST_FAILED', 'WEBHOOK_FAILED', 'ACCOUNT_DISABLED', 'MANUAL_REVIEW');

DROP INDEX IF EXISTS "SocialAccount_brandId_platform_key";

ALTER TABLE "SocialAccount"
  ADD COLUMN "externalAccountId" TEXT,
  ADD COLUMN "accountType" "SocialAccountType" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "lifecycleStatus" "SocialAccountLifecycleStatus" NOT NULL DEFAULT 'KNOWN',
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "ownershipNotes" TEXT,
  ADD COLUMN "metadataVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulApiInteractionAt" TIMESTAMP(3),
  ADD COLUMN "publishingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "analyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "communityEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isDefaultForPlatform" BOOLEAN NOT NULL DEFAULT false;

-- Existing rows are inventory only. A handle or profile URL is not proof of
-- platform identity, authorization, capability, or API health.
UPDATE "SocialAccount"
SET "connectionStatus" = 'NOT_CONNECTED',
    "publishingMode" = 'MANUAL',
    "autopilotAllowed" = false,
    "publishingEnabled" = false,
    "analyticsEnabled" = false,
    "communityEnabled" = false,
    "lifecycleStatus" = 'KNOWN',
    "metadataVerifiedAt" = NULL,
    "lastSuccessfulApiInteractionAt" = NULL;

CREATE UNIQUE INDEX "SocialAccount_platform_externalAccountId_key"
  ON "SocialAccount"("platform", "externalAccountId");
CREATE INDEX "SocialAccount_brandId_platform_lifecycleStatus_idx"
  ON "SocialAccount"("brandId", "platform", "lifecycleStatus");
CREATE UNIQUE INDEX "SocialAccount_one_default_per_brand_platform_key"
  ON "SocialAccount"("brandId", "platform") WHERE "isDefaultForPlatform" = true;

CREATE TABLE "SocialPlatformApplication" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "platform" "SocialPlatform" NOT NULL,
  "environment" "SocialPlatformApplicationEnvironment" NOT NULL,
  "status" "SocialPlatformApplicationStatus" NOT NULL DEFAULT 'DISABLED',
  "providerApplicationId" TEXT,
  "clientCredentialRef" TEXT,
  "signingSecretRef" TEXT,
  "callbackPath" TEXT,
  "featureFlagKey" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialPlatformApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialAuthorization" (
  "id" TEXT NOT NULL,
  "platformApplicationId" TEXT NOT NULL,
  "authorizedById" TEXT,
  "providerAuthorizationId" TEXT,
  "providerPrincipalId" TEXT,
  "status" "SocialAuthorizationStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  "grantedScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requiredScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "accessCredentialRef" TEXT,
  "refreshCredentialRef" TEXT,
  "expiresAt" TIMESTAMP(3),
  "refreshCapable" BOOLEAN NOT NULL DEFAULT false,
  "lastRefreshedAt" TIMESTAMP(3),
  "lastValidatedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "reauthorizationReason" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "lastErrorAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialAuthorization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialAuthorizationAccount" (
  "id" TEXT NOT NULL,
  "authorizationId" TEXT NOT NULL,
  "socialAccountId" TEXT NOT NULL,
  "status" "SocialAuthorizationAccountStatus" NOT NULL DEFAULT 'DISCOVERED',
  "providerRelationshipType" TEXT,
  "providerRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "lastAccessibleAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialAuthorizationAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialCapabilitySnapshot" (
  "id" TEXT NOT NULL,
  "authorizationAccountId" TEXT NOT NULL,
  "socialAccountId" TEXT NOT NULL,
  "adapterVersion" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "verificationMethod" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validUntil" TIMESTAMP(3) NOT NULL,
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialCapabilitySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialCapabilityResult" (
  "id" TEXT NOT NULL,
  "snapshotId" TEXT NOT NULL,
  "capability" "SocialCapability" NOT NULL,
  "state" "SocialCapabilityState" NOT NULL,
  "requiredScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "presentScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "reasonCode" TEXT,
  "evidence" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialCapabilityResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SocialConnectionHealthObservation" (
  "id" TEXT NOT NULL,
  "socialAccountId" TEXT NOT NULL,
  "authorizationAccountId" TEXT,
  "state" "SocialConnectionHealthState" NOT NULL,
  "signal" "SocialConnectionHealthSignal" NOT NULL,
  "code" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "operatorActionRequired" BOOLEAN NOT NULL DEFAULT false,
  "dedupeKey" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialConnectionHealthObservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SocialPlatformApplication_key_key" ON "SocialPlatformApplication"("key");
CREATE UNIQUE INDEX "SocialPlatformApplication_platform_environment_providerApplicationId_key" ON "SocialPlatformApplication"("platform", "environment", "providerApplicationId");
CREATE INDEX "SocialPlatformApplication_platform_environment_status_idx" ON "SocialPlatformApplication"("platform", "environment", "status");
CREATE UNIQUE INDEX "SocialAuthorization_platformApplicationId_providerAuthorizationId_key" ON "SocialAuthorization"("platformApplicationId", "providerAuthorizationId");
CREATE INDEX "SocialAuthorization_platformApplicationId_status_expiresAt_idx" ON "SocialAuthorization"("platformApplicationId", "status", "expiresAt");
CREATE INDEX "SocialAuthorization_authorizedById_createdAt_idx" ON "SocialAuthorization"("authorizedById", "createdAt");
CREATE UNIQUE INDEX "SocialAuthorizationAccount_authorizationId_socialAccountId_key" ON "SocialAuthorizationAccount"("authorizationId", "socialAccountId");
CREATE INDEX "SocialAuthorizationAccount_socialAccountId_status_idx" ON "SocialAuthorizationAccount"("socialAccountId", "status");
CREATE UNIQUE INDEX "SocialCapabilitySnapshot_fingerprint_key" ON "SocialCapabilitySnapshot"("fingerprint");
CREATE INDEX "SocialCapabilitySnapshot_socialAccountId_validUntil_idx" ON "SocialCapabilitySnapshot"("socialAccountId", "validUntil");
CREATE INDEX "SocialCapabilitySnapshot_authorizationAccountId_verifiedAt_idx" ON "SocialCapabilitySnapshot"("authorizationAccountId", "verifiedAt");
CREATE UNIQUE INDEX "SocialCapabilityResult_snapshotId_capability_key" ON "SocialCapabilityResult"("snapshotId", "capability");
CREATE INDEX "SocialCapabilityResult_capability_state_idx" ON "SocialCapabilityResult"("capability", "state");
CREATE INDEX "SocialConnectionHealthObservation_socialAccountId_observedAt_idx" ON "SocialConnectionHealthObservation"("socialAccountId", "observedAt");
CREATE INDEX "SocialConnectionHealthObservation_operatorActionRequired_resolvedAt_observedAt_idx" ON "SocialConnectionHealthObservation"("operatorActionRequired", "resolvedAt", "observedAt");
CREATE INDEX "SocialConnectionHealthObservation_dedupeKey_resolvedAt_idx" ON "SocialConnectionHealthObservation"("dedupeKey", "resolvedAt");
CREATE UNIQUE INDEX "SocialConnectionHealthObservation_open_dedupe_key"
  ON "SocialConnectionHealthObservation"("dedupeKey") WHERE "resolvedAt" IS NULL;

ALTER TABLE "SocialAuthorization" ADD CONSTRAINT "SocialAuthorization_platformApplicationId_fkey" FOREIGN KEY ("platformApplicationId") REFERENCES "SocialPlatformApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SocialAuthorization" ADD CONSTRAINT "SocialAuthorization_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SocialAuthorizationAccount" ADD CONSTRAINT "SocialAuthorizationAccount_authorizationId_fkey" FOREIGN KEY ("authorizationId") REFERENCES "SocialAuthorization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialAuthorizationAccount" ADD CONSTRAINT "SocialAuthorizationAccount_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialCapabilitySnapshot" ADD CONSTRAINT "SocialCapabilitySnapshot_authorizationAccountId_fkey" FOREIGN KEY ("authorizationAccountId") REFERENCES "SocialAuthorizationAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialCapabilitySnapshot" ADD CONSTRAINT "SocialCapabilitySnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialCapabilityResult" ADD CONSTRAINT "SocialCapabilityResult_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SocialCapabilitySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialConnectionHealthObservation" ADD CONSTRAINT "SocialConnectionHealthObservation_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialConnectionHealthObservation" ADD CONSTRAINT "SocialConnectionHealthObservation_authorizationAccountId_fkey" FOREIGN KEY ("authorizationAccountId") REFERENCES "SocialAuthorizationAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION "reject_social_capability_mutation"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Social capability snapshots and results are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SocialCapabilitySnapshot_immutable"
BEFORE UPDATE ON "SocialCapabilitySnapshot"
FOR EACH ROW EXECUTE FUNCTION "reject_social_capability_mutation"();

CREATE TRIGGER "SocialCapabilityResult_immutable"
BEFORE UPDATE ON "SocialCapabilityResult"
FOR EACH ROW EXECUTE FUNCTION "reject_social_capability_mutation"();
