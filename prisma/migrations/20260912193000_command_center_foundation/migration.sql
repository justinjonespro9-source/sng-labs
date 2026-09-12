-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "BrandKind" AS ENUM ('CORPORATE', 'PRODUCT');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('X', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'THREADS', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'NEEDS_ATTENTION', 'DISABLED');

-- CreateEnum
CREATE TYPE "PublishingMode" AS ENUM ('MANUAL', 'ASSISTED', 'SELECTIVE_AUTOPILOT');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('NEW', 'REVIEWED', 'DEVELOPING', 'QUEUED', 'COMPLETE', 'NO_POST', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'READY', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REVISION_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('PLANNED', 'READY', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HealthState" AS ENUM ('HEALTHY', 'WATCH', 'RECOVERY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BrandKind" NOT NULL,
    "description" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "voice" TEXT NOT NULL,
    "objectives" TEXT[],
    "preferredContent" TEXT[],
    "prohibitedContent" TEXT[],
    "callToActionRules" TEXT NOT NULL,
    "visualDirection" TEXT NOT NULL,
    "defaultCadenceNotes" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT,
    "profileUrl" TEXT,
    "connectionStatus" "ConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "publishingMode" "PublishingMode" NOT NULL DEFAULT 'MANUAL',
    "cadenceRules" JSONB,
    "platformRules" JSONB,
    "autopilotAllowed" BOOLEAN NOT NULL DEFAULT false,
    "currentHealth" "HealthState" NOT NULL DEFAULT 'HEALTHY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceEvent" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "sourceProduct" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "headline" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "publicUrl" TEXT,
    "significance" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SourceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'NEW',
    "urgency" INTEGER NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION,
    "recommendedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "noPostRationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandAngle" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "suggestedVisual" TEXT,
    "timingNotes" TEXT,
    "riskNotes" TEXT,
    "similarityRisk" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandAngle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "brandAngleId" TEXT NOT NULL,
    "socialAccountId" TEXT,
    "status" "DraftStatus" NOT NULL DEFAULT 'DRAFT',
    "body" TEXT NOT NULL,
    "visualBrief" TEXT,
    "callToAction" TEXT,
    "modelProvider" TEXT,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "sourceFacts" JSONB,
    "aiConfidence" DOUBLE PRECISION,
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "platformPostId" TEXT,
    "platformUrl" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignOpportunity" (
    "campaignId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,

    CONSTRAINT "CampaignOpportunity_pkey" PRIMARY KEY ("campaignId","opportunityId")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "followers" INTEGER,
    "impressions" INTEGER,
    "reach" INTEGER,
    "followerReach" INTEGER,
    "nonFollowerReach" INTEGER,
    "engagements" INTEGER,
    "postsPublished" INTEGER,
    "rawMetrics" JSONB,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountHealthSnapshot" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "state" "HealthState" NOT NULL,
    "score" INTEGER,
    "reachTrendPercent" DOUBLE PRECISION,
    "engagementTrendPercent" DOUBLE PRECISION,
    "nonFollowerShare" DOUBLE PRECISION,
    "cadenceVariance" DOUBLE PRECISION,
    "reasons" TEXT[],
    "recommendedActions" TEXT[],
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountHealthSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_key_key" ON "Brand"("key");

-- CreateIndex
CREATE INDEX "SocialAccount_platform_connectionStatus_idx" ON "SocialAccount"("platform", "connectionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_brandId_platform_key" ON "SocialAccount"("brandId", "platform");

-- CreateIndex
CREATE INDEX "SourceEvent_occurredAt_idx" ON "SourceEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SourceEvent_sourceProduct_externalEventId_key" ON "SourceEvent"("sourceProduct", "externalEventId");

-- CreateIndex
CREATE INDEX "Opportunity_status_recommendedAt_idx" ON "Opportunity"("status", "recommendedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandAngle_opportunityId_brandId_key" ON "BrandAngle"("opportunityId", "brandId");

-- CreateIndex
CREATE INDEX "ContentDraft_status_scheduledFor_idx" ON "ContentDraft"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Approval_draftId_createdAt_idx" ON "Approval"("draftId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_draftId_key" ON "Publication"("draftId");

-- CreateIndex
CREATE INDEX "MetricSnapshot_brandId_capturedAt_idx" ON "MetricSnapshot"("brandId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MetricSnapshot_socialAccountId_capturedAt_periodStart_perio_key" ON "MetricSnapshot"("socialAccountId", "capturedAt", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AccountHealthSnapshot_socialAccountId_calculatedAt_idx" ON "AccountHealthSnapshot"("socialAccountId", "calculatedAt");

-- CreateIndex
CREATE INDEX "Job_status_runAfter_idx" ON "Job"("status", "runAfter");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "SourceEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAngle" ADD CONSTRAINT "BrandAngle_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandAngle" ADD CONSTRAINT "BrandAngle_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_brandAngleId_fkey" FOREIGN KEY ("brandAngleId") REFERENCES "BrandAngle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignOpportunity" ADD CONSTRAINT "CampaignOpportunity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignOpportunity" ADD CONSTRAINT "CampaignOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountHealthSnapshot" ADD CONSTRAINT "AccountHealthSnapshot_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
