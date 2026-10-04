-- CreateEnum
CREATE TYPE "GrowthStage" AS ENUM ('DEVELOPMENT', 'VALIDATION', 'PILOT', 'ACQUISITION', 'RETENTION');

-- CreateEnum
CREATE TYPE "GrowthRecordStatus" AS ENUM ('DRAFT', 'CURRENT', 'SUPERSEDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PortfolioAllocation" AS ENUM ('PRIMARY_PUSH', 'ACTIVE_TEST', 'PREP', 'VALIDATION', 'MAINTENANCE', 'HOLD');

-- CreateEnum
CREATE TYPE "CampaignReviewDecision" AS ENUM ('CONTINUE', 'EXPAND', 'REVISE', 'STOP');

-- CreateEnum
CREATE TYPE "RelationshipActivityDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "GrowthFunnelStage" AS ENUM ('REACH', 'VISIT', 'SIGNUP', 'ACTIVATION', 'REPEAT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "GrowthMetricUnit" AS ENUM ('COUNT', 'RATE', 'AMOUNT');

-- CreateEnum
CREATE TYPE "GrowthMetricAggregation" AS ENUM ('SUM', 'LATEST', 'COHORT');

-- CreateEnum
CREATE TYPE "GrowthMetricDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "GrowthMeasurementStatus" AS ENUM ('UNKNOWN', 'REPORTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "GrowthActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublicationMethod" AS ENUM ('MANUAL', 'API');

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "confirmationNote" TEXT,
ADD COLUMN     "method" "PublicationMethod",
ADD COLUMN     "recordedById" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "actualSpendMinor" INTEGER,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "destinationUrl" TEXT,
ADD COLUMN     "executionPlan" TEXT,
ADD COLUMN     "expectedMinutes" INTEGER,
ADD COLUMN     "hypothesis" TEXT,
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "plannedSpendMinor" INTEGER;

-- AlterTable
ALTER TABLE "Relationship" ADD COLUMN     "audience" TEXT,
ADD COLUMN     "commitment" TEXT,
ADD COLUMN     "fitReason" TEXT,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "offer" TEXT,
ADD COLUMN     "outcome" TEXT,
ADD COLUMN     "priority" "ActivationPriority",
ADD COLUMN     "priorityEvidence" TEXT;

-- AlterTable
ALTER TABLE "RelationshipActivity" ADD COLUMN     "direction" "RelationshipActivityDirection";

-- CreateTable
CREATE TABLE "RelationshipCampaign" (
    "relationshipId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RelationshipCampaign_pkey" PRIMARY KEY ("relationshipId","campaignId")
);

-- CreateTable
CREATE TABLE "BrandGrowthBrief" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "stage" "GrowthStage" NOT NULL,
    "status" "GrowthRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "priorityAudience" TEXT,
    "marketId" TEXT,
    "geographyNotes" TEXT,
    "offer" TEXT,
    "activationDefinition" TEXT,
    "repeatDefinition" TEXT,
    "bottleneck" TEXT,
    "primaryMotion" TEXT,
    "capacityNotes" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "notes" TEXT,
    "evidence" JSONB,
    "createdById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandGrowthBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPortfolioPriority" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "allocation" "PortfolioAllocation" NOT NULL,
    "status" "GrowthRecordStatus" NOT NULL DEFAULT 'CURRENT',
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "reviewAt" TIMESTAMP(3),
    "rationale" TEXT NOT NULL,
    "evidence" JSONB,
    "weeklyHours" INTEGER,
    "decidedById" TEXT,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandPortfolioPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignTarget" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "metricDefinitionId" TEXT NOT NULL,
    "activationId" TEXT,
    "targetValue" DECIMAL(18,4) NOT NULL,
    "baselineValue" DECIMAL(18,4),
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignReview" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "decision" "CampaignReviewDecision" NOT NULL,
    "learning" TEXT NOT NULL,
    "evidence" JSONB,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMetricDefinition" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "funnelStage" "GrowthFunnelStage" NOT NULL,
    "unit" "GrowthMetricUnit" NOT NULL,
    "definition" TEXT NOT NULL,
    "aggregation" "GrowthMetricAggregation" NOT NULL,
    "numeratorDefinition" TEXT,
    "denominatorDefinition" TEXT,
    "cohortBasis" TEXT,
    "freshnessDays" INTEGER,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "status" "GrowthMetricDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthMetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthMeasurement" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(18,4),
    "numerator" DECIMAL(18,4),
    "denominator" DECIMAL(18,4),
    "status" "GrowthMeasurementStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "asOfAt" TIMESTAMP(3) NOT NULL,
    "enteredById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "campaignId" TEXT,
    "activationId" TEXT,
    "scope" TEXT,
    "cohortKey" TEXT,
    "evidence" JSONB,
    "externalKey" TEXT,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthAction" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ownerId" TEXT,
    "brandId" TEXT,
    "campaignId" TEXT,
    "relationshipId" TEXT,
    "status" "GrowthActionStatus" NOT NULL DEFAULT 'OPEN',
    "operatorPriority" INTEGER,
    "dueAt" TIMESTAMP(3),
    "rationale" TEXT,
    "evidence" TEXT,
    "blocker" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RelationshipCampaign_campaignId_idx" ON "RelationshipCampaign"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandGrowthBrief_supersedesId_key" ON "BrandGrowthBrief"("supersedesId");

-- CreateIndex
CREATE INDEX "BrandGrowthBrief_brandId_status_idx" ON "BrandGrowthBrief"("brandId", "status");

-- CreateIndex
CREATE INDEX "BrandGrowthBrief_status_reviewAt_idx" ON "BrandGrowthBrief"("status", "reviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandGrowthBrief_brandId_revision_key" ON "BrandGrowthBrief"("brandId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPortfolioPriority_supersedesId_key" ON "BrandPortfolioPriority"("supersedesId");

-- CreateIndex
CREATE INDEX "BrandPortfolioPriority_brandId_status_idx" ON "BrandPortfolioPriority"("brandId", "status");

-- CreateIndex
CREATE INDEX "BrandPortfolioPriority_status_reviewAt_idx" ON "BrandPortfolioPriority"("status", "reviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPortfolioPriority_brandId_revision_key" ON "BrandPortfolioPriority"("brandId", "revision");

-- CreateIndex
CREATE INDEX "CampaignTarget_campaignId_periodStart_idx" ON "CampaignTarget"("campaignId", "periodStart");

-- CreateIndex
CREATE INDEX "CampaignTarget_metricDefinitionId_idx" ON "CampaignTarget"("metricDefinitionId");

-- CreateIndex
CREATE INDEX "CampaignReview_campaignId_reviewedAt_idx" ON "CampaignReview"("campaignId", "reviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMetricDefinition_supersedesId_key" ON "GrowthMetricDefinition"("supersedesId");

-- CreateIndex
CREATE INDEX "GrowthMetricDefinition_brandId_status_idx" ON "GrowthMetricDefinition"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMetricDefinition_brandId_key_version_key" ON "GrowthMetricDefinition"("brandId", "key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMeasurement_supersedesId_key" ON "GrowthMeasurement"("supersedesId");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_definitionId_periodStart_periodEnd_idx" ON "GrowthMeasurement"("definitionId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_brandId_status_asOfAt_idx" ON "GrowthMeasurement"("brandId", "status", "asOfAt");

-- CreateIndex
CREATE INDEX "GrowthMeasurement_campaignId_definitionId_idx" ON "GrowthMeasurement"("campaignId", "definitionId");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthMeasurement_definitionId_externalKey_key" ON "GrowthMeasurement"("definitionId", "externalKey");

-- CreateIndex
CREATE INDEX "GrowthAction_status_operatorPriority_dueAt_idx" ON "GrowthAction"("status", "operatorPriority", "dueAt");

-- CreateIndex
CREATE INDEX "GrowthAction_ownerId_status_idx" ON "GrowthAction"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Campaign_ownerId_status_idx" ON "Campaign"("ownerId", "status");

-- CreateIndex
CREATE INDEX "RelationshipActivity_direction_occurredAt_idx" ON "RelationshipActivity"("direction", "occurredAt");

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipCampaign" ADD CONSTRAINT "RelationshipCampaign_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipCampaign" ADD CONSTRAINT "RelationshipCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGrowthBrief" ADD CONSTRAINT "BrandGrowthBrief_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGrowthBrief" ADD CONSTRAINT "BrandGrowthBrief_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGrowthBrief" ADD CONSTRAINT "BrandGrowthBrief_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGrowthBrief" ADD CONSTRAINT "BrandGrowthBrief_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandGrowthBrief" ADD CONSTRAINT "BrandGrowthBrief_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "BrandGrowthBrief"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPortfolioPriority" ADD CONSTRAINT "BrandPortfolioPriority_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPortfolioPriority" ADD CONSTRAINT "BrandPortfolioPriority_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPortfolioPriority" ADD CONSTRAINT "BrandPortfolioPriority_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "BrandPortfolioPriority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_metricDefinitionId_fkey" FOREIGN KEY ("metricDefinitionId") REFERENCES "GrowthMetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "CampaignActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReview" ADD CONSTRAINT "CampaignReview_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignReview" ADD CONSTRAINT "CampaignReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMetricDefinition" ADD CONSTRAINT "GrowthMetricDefinition_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMetricDefinition" ADD CONSTRAINT "GrowthMetricDefinition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMetricDefinition" ADD CONSTRAINT "GrowthMetricDefinition_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "GrowthMetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "GrowthMetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "CampaignActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "GrowthMeasurement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthAction" ADD CONSTRAINT "GrowthAction_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "Relationship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Growth OS: at most one CURRENT strategy record per brand
CREATE UNIQUE INDEX "BrandGrowthBrief_one_current_per_brand" ON "BrandGrowthBrief"("brandId") WHERE "status" = 'CURRENT';

CREATE UNIQUE INDEX "BrandPortfolioPriority_one_current_per_brand" ON "BrandPortfolioPriority"("brandId") WHERE "status" = 'CURRENT';

-- Growth OS: money and time inputs are non-negative integers
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_expectedMinutes_nonnegative" CHECK ("expectedMinutes" IS NULL OR "expectedMinutes" >= 0);
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_plannedSpendMinor_nonnegative" CHECK ("plannedSpendMinor" IS NULL OR "plannedSpendMinor" >= 0);
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_actualSpendMinor_nonnegative" CHECK ("actualSpendMinor" IS NULL OR "actualSpendMinor" >= 0);
ALTER TABLE "BrandPortfolioPriority" ADD CONSTRAINT "BrandPortfolioPriority_weeklyHours_nonnegative" CHECK ("weeklyHours" IS NULL OR "weeklyHours" >= 0);
ALTER TABLE "GrowthMetricDefinition" ADD CONSTRAINT "GrowthMetricDefinition_freshnessDays_positive" CHECK ("freshnessDays" IS NULL OR "freshnessDays" > 0);
ALTER TABLE "CampaignTarget" ADD CONSTRAINT "CampaignTarget_period_order" CHECK ("periodEnd" > "periodStart");
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_period_order" CHECK ("periodEnd" > "periodStart");
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_unknown_iff_null" CHECK (("status" = 'UNKNOWN') = ("value" IS NULL));
ALTER TABLE "GrowthMeasurement" ADD CONSTRAINT "GrowthMeasurement_denominator_positive" CHECK ("denominator" IS NULL OR "denominator" > 0);

-- Growth OS: preserve legacy single-campaign relationship links in the junction (idempotent)
INSERT INTO "RelationshipCampaign" ("relationshipId", "campaignId", "source")
SELECT "id", "campaignId", 'LEGACY_CAMPAIGN_ID'
FROM "Relationship"
WHERE "campaignId" IS NOT NULL
ON CONFLICT DO NOTHING;
