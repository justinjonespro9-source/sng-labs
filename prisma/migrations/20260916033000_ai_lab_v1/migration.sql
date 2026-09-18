-- CreateEnum
CREATE TYPE "GenerationRecommendation" AS ENUM ('CREATE', 'DO_NOT_POST', 'NEEDS_MORE_CONTEXT');

-- CreateEnum
CREATE TYPE "GenerationRunStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OperatorContextTrust" AS ENUM ('OPERATOR_SUPPLIED', 'HYPOTHETICAL');

-- CreateTable
CREATE TABLE "GenerationRun" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "brandId" TEXT,
    "campaignId" TEXT,
    "activationId" TEXT,
    "opportunityId" TEXT,
    "relationshipId" TEXT,
    "contentId" TEXT,
    "channel" TEXT NOT NULL,
    "audienceSegment" TEXT,
    "operatorContext" TEXT,
    "operatorContextTrust" "OperatorContextTrust",
    "resolvedContext" JSONB NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "generationVersion" TEXT NOT NULL,
    "recommendation" "GenerationRecommendation",
    "structuredOutput" JSONB,
    "status" "GenerationRunStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationRun_contentId_key" ON "GenerationRun"("contentId");
CREATE INDEX "GenerationRun_createdAt_idx" ON "GenerationRun"("createdAt");
CREATE INDEX "GenerationRun_brandId_createdAt_idx" ON "GenerationRun"("brandId", "createdAt");
CREATE INDEX "GenerationRun_status_createdAt_idx" ON "GenerationRun"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "CampaignActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentDraft"("id") ON DELETE SET NULL ON UPDATE CASCADE;
