-- Game-Day Engine V1 is additive. Existing generic events and legacy venue text remain valid.
CREATE TYPE "GrowthEventStatus" AS ENUM ('SCHEDULED', 'TIME_TBD', 'POSTPONED', 'CANCELLED', 'LIVE', 'FINAL');
CREATE TYPE "RecommendationOutcome" AS ENUM ('CREATE_OPPORTUNITY', 'SKIP', 'NEEDS_CONTEXT');
CREATE TYPE "RecommendationReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'SKIPPED', 'DISMISSED', 'STALE');
CREATE TYPE "RecommendationNaturalUnit" AS ENUM ('EVENT', 'VENUE', 'MARKET', 'WEEK', 'SLATE', 'CAMPAIGN');

CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "timeZone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT,
    "externalId" TEXT,
    "stadiumSlopVenueKey" TEXT,
    "marketId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Team"
  ADD COLUMN "abbreviation" TEXT,
  ADD COLUMN "externalSource" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "homeVenueId" TEXT;

ALTER TABLE "GrowthEvent"
  ADD COLUMN "key" TEXT,
  ADD COLUMN "sport" TEXT,
  ADD COLUMN "league" TEXT,
  ADD COLUMN "season" INTEGER,
  ADD COLUMN "week" INTEGER,
  ADD COLUMN "status" "GrowthEventStatus" NOT NULL DEFAULT 'SCHEDULED',
  ADD COLUMN "homeTeamId" TEXT,
  ADD COLUMN "awayTeamId" TEXT,
  ADD COLUMN "venueId" TEXT,
  ADD COLUMN "neutralSite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "sourceEventId" TEXT,
  ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "importedAt" TIMESTAMP(3),
  ADD COLUMN "sourceMetadata" JSONB;

ALTER TABLE "CampaignActivation" ADD COLUMN "venueId" TEXT;
ALTER TABLE "Opportunity" ADD COLUMN "eventId" TEXT;
ALTER TABLE "GenerationRun" ADD COLUMN "eventId" TEXT;

CREATE TABLE "OpportunityRecommendation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "eventId" TEXT,
    "campaignId" TEXT,
    "activationId" TEXT,
    "scope" "RecommendationNaturalUnit" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "outcome" "RecommendationOutcome" NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" "ActivationPriority" NOT NULL DEFAULT 'MEDIUM',
    "reviewStatus" "RecommendationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "contextSnapshot" JSONB NOT NULL,
    "ruleVersion" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "acceptedOpportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Venue_key_key" ON "Venue"("key");
CREATE UNIQUE INDEX "Venue_stadiumSlopVenueKey_key" ON "Venue"("stadiumSlopVenueKey");
CREATE UNIQUE INDEX "Venue_source_externalId_key" ON "Venue"("source", "externalId");
CREATE INDEX "Venue_marketId_active_idx" ON "Venue"("marketId", "active");

CREATE UNIQUE INDEX "Team_league_abbreviation_key" ON "Team"("league", "abbreviation");
CREATE UNIQUE INDEX "Team_externalSource_externalId_key" ON "Team"("externalSource", "externalId");
CREATE INDEX "Team_homeVenueId_idx" ON "Team"("homeVenueId");

CREATE UNIQUE INDEX "GrowthEvent_key_key" ON "GrowthEvent"("key");
CREATE UNIQUE INDEX "GrowthEvent_source_sourceEventId_key" ON "GrowthEvent"("source", "sourceEventId");
CREATE INDEX "GrowthEvent_league_season_week_startsAt_idx" ON "GrowthEvent"("league", "season", "week", "startsAt");
CREATE INDEX "GrowthEvent_homeTeamId_startsAt_idx" ON "GrowthEvent"("homeTeamId", "startsAt");
CREATE INDEX "GrowthEvent_awayTeamId_startsAt_idx" ON "GrowthEvent"("awayTeamId", "startsAt");
CREATE INDEX "GrowthEvent_venueId_startsAt_idx" ON "GrowthEvent"("venueId", "startsAt");

CREATE UNIQUE INDEX "OpportunityRecommendation_acceptedOpportunityId_key" ON "OpportunityRecommendation"("acceptedOpportunityId");
CREATE UNIQUE INDEX "OpportunityRecommendation_brandId_scopeKey_ruleVersion_key" ON "OpportunityRecommendation"("brandId", "scopeKey", "ruleVersion");
CREATE INDEX "OpportunityRecommendation_reviewStatus_evaluatedAt_idx" ON "OpportunityRecommendation"("reviewStatus", "evaluatedAt");
CREATE INDEX "OpportunityRecommendation_eventId_outcome_idx" ON "OpportunityRecommendation"("eventId", "outcome");
CREATE INDEX "OpportunityRecommendation_brandId_outcome_evaluatedAt_idx" ON "OpportunityRecommendation"("brandId", "outcome", "evaluatedAt");
CREATE INDEX "Opportunity_eventId_status_idx" ON "Opportunity"("eventId", "status");
CREATE INDEX "GenerationRun_eventId_createdAt_idx" ON "GenerationRun"("eventId", "createdAt");

ALTER TABLE "Venue" ADD CONSTRAINT "Venue_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_homeVenueId_fkey" FOREIGN KEY ("homeVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignActivation" ADD CONSTRAINT "CampaignActivation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GenerationRun" ADD CONSTRAINT "GenerationRun_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OpportunityRecommendation" ADD CONSTRAINT "OpportunityRecommendation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityRecommendation" ADD CONSTRAINT "OpportunityRecommendation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpportunityRecommendation" ADD CONSTRAINT "OpportunityRecommendation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpportunityRecommendation" ADD CONSTRAINT "OpportunityRecommendation_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "CampaignActivation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpportunityRecommendation" ADD CONSTRAINT "OpportunityRecommendation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OpportunityRecommendation" ADD CONSTRAINT "OpportunityRecommendation_acceptedOpportunityId_fkey" FOREIGN KEY ("acceptedOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
