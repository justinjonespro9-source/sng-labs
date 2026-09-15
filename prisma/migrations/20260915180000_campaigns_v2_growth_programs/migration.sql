CREATE TYPE "CampaignObjectiveType" AS ENUM ('USER_ACQUISITION', 'PARTICIPATION', 'RETENTION', 'BRAND_AWARENESS', 'CREATOR_ACTIVATION', 'MEDIA_EARNED', 'PARTNERSHIP', 'INDUSTRY_OUTREACH', 'PRODUCT_VALIDATION', 'OTHER');
CREATE TYPE "ActivationStatus" AS ENUM ('PLANNED', 'READY', 'ACTIVE', 'COMPLETE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "ActivationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ExecutionType" AS ENUM ('ORGANIC_SOCIAL', 'CREATOR_OUTREACH', 'MEDIA_OUTREACH', 'COMMUNITY', 'PARTNERSHIP', 'PAID', 'PRODUCT_EVENT', 'OTHER');

ALTER TABLE "Campaign"
  ADD COLUMN "key" TEXT,
  ADD COLUMN "programId" TEXT,
  ADD COLUMN "objectiveType" "CampaignObjectiveType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "primaryAudience" TEXT,
  ADD COLUMN "primaryCta" TEXT,
  ADD COLUMN "coreMessage" TEXT,
  ADD COLUMN "sport" TEXT,
  ADD COLUMN "season" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "successDefinition" TEXT,
  ADD COLUMN "kpis" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Opportunity" ADD COLUMN "activationId" TEXT;
ALTER TABLE "RelationshipActivity"
  ADD COLUMN "activationId" TEXT,
  ADD COLUMN "executionType" "ExecutionType";

CREATE TABLE "GrowthProgram" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "operatingDescription" TEXT,
  "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignActivation" (
  "id" TEXT NOT NULL,
  "key" TEXT,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "ActivationStatus" NOT NULL DEFAULT 'PLANNED',
  "priority" "ActivationPriority" NOT NULL DEFAULT 'MEDIUM',
  "marketId" TEXT,
  "teamId" TEXT,
  "eventId" TEXT,
  "venueName" TEXT,
  "sport" TEXT,
  "season" TEXT,
  "week" INTEGER,
  "slateLabel" TEXT,
  "audienceSegment" TEXT,
  "coreMessage" TEXT,
  "callToAction" TEXT,
  "objective" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignActivation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_BrandGrowthPrograms" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_BrandGrowthPrograms_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE TABLE "_ActivationBrands" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_ActivationBrands_AB_pkey" PRIMARY KEY ("A", "B")
);
CREATE TABLE "_ActivationRelationships" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_ActivationRelationships_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE UNIQUE INDEX "Campaign_key_key" ON "Campaign"("key");
CREATE INDEX "Campaign_programId_status_idx" ON "Campaign"("programId", "status");
CREATE UNIQUE INDEX "GrowthProgram_key_key" ON "GrowthProgram"("key");
CREATE UNIQUE INDEX "CampaignActivation_key_key" ON "CampaignActivation"("key");
CREATE INDEX "CampaignActivation_campaignId_status_startsAt_idx" ON "CampaignActivation"("campaignId", "status", "startsAt");
CREATE INDEX "CampaignActivation_marketId_teamId_idx" ON "CampaignActivation"("marketId", "teamId");
CREATE INDEX "CampaignActivation_sport_season_week_idx" ON "CampaignActivation"("sport", "season", "week");
CREATE INDEX "Opportunity_activationId_status_idx" ON "Opportunity"("activationId", "status");
CREATE INDEX "RelationshipActivity_campaignId_activationId_occurredAt_idx" ON "RelationshipActivity"("campaignId", "activationId", "occurredAt");
CREATE INDEX "_BrandGrowthPrograms_B_index" ON "_BrandGrowthPrograms"("B");
CREATE INDEX "_ActivationBrands_B_index" ON "_ActivationBrands"("B");
CREATE INDEX "_ActivationRelationships_B_index" ON "_ActivationRelationships"("B");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_programId_fkey" FOREIGN KEY ("programId") REFERENCES "GrowthProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignActivation" ADD CONSTRAINT "CampaignActivation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignActivation" ADD CONSTRAINT "CampaignActivation_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignActivation" ADD CONSTRAINT "CampaignActivation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignActivation" ADD CONSTRAINT "CampaignActivation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "CampaignActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RelationshipActivity" ADD CONSTRAINT "RelationshipActivity_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "CampaignActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_BrandGrowthPrograms" ADD CONSTRAINT "_BrandGrowthPrograms_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BrandGrowthPrograms" ADD CONSTRAINT "_BrandGrowthPrograms_B_fkey" FOREIGN KEY ("B") REFERENCES "GrowthProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ActivationBrands" ADD CONSTRAINT "_ActivationBrands_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ActivationBrands" ADD CONSTRAINT "_ActivationBrands_B_fkey" FOREIGN KEY ("B") REFERENCES "CampaignActivation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ActivationRelationships" ADD CONSTRAINT "_ActivationRelationships_A_fkey" FOREIGN KEY ("A") REFERENCES "CampaignActivation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ActivationRelationships" ADD CONSTRAINT "_ActivationRelationships_B_fkey" FOREIGN KEY ("B") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
