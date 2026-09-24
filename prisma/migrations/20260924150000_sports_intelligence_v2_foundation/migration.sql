-- Sports Intelligence V2 foundation is additive. Compatibility strings remain intact.
CREATE TYPE "BrandSportsRelevanceScope" AS ENUM ('LEAGUE', 'TEAM', 'VENUE', 'MARKET');
CREATE TYPE "BrandSportsRelevanceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RETIRED');
CREATE TYPE "BrandSportsRelevanceSource" AS ENUM ('OPERATOR', 'LEGACY_TEAM_LINK', 'CAMPAIGN', 'ACTIVATION', 'RULE');

ALTER TYPE "SportsIngestionType" ADD VALUE 'TEAM_DIRECTORY';
ALTER TYPE "SportsIngestionType" ADD VALUE 'VENUE_DIRECTORY';
ALTER TYPE "SportsIngestionType" ADD VALUE 'SCHEDULE';
ALTER TYPE "SportsIngestionType" ADD VALUE 'SCHEDULE_CORRECTION';

ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'UNRESOLVED_LEAGUE';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'UNRESOLVED_TEAM';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'UNRESOLVED_VENUE';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'DUPLICATE_EVENT';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'CONFLICTING_SCHEDULE';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'INCOMPLETE_PROVENANCE';

ALTER TABLE "Team" ADD COLUMN "leagueId" TEXT;
ALTER TABLE "GrowthEvent" ADD COLUMN "leagueId" TEXT, ADD COLUMN "seasonId" TEXT;
ALTER TABLE "SportsSeason" ADD COLUMN "leagueId" TEXT;
ALTER TABLE "SportsIngestionRun" ADD COLUMN "leagueId" TEXT;

CREATE TABLE "Sport" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "League" (
  "id" TEXT NOT NULL,
  "sportId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subdivision" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeagueExternalIdentity" (
  "id" TEXT NOT NULL,
  "leagueId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "sourceReference" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeagueExternalIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamExternalIdentity" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "sourceReference" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamExternalIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VenueExternalIdentity" (
  "id" TEXT NOT NULL,
  "venueId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "sourceReference" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VenueExternalIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GrowthEventExternalIdentity" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "sourceLabel" TEXT,
  "sourceReference" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GrowthEventExternalIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrandSportsRelevance" (
  "id" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "scope" "BrandSportsRelevanceScope" NOT NULL,
  "status" "BrandSportsRelevanceStatus" NOT NULL DEFAULT 'ACTIVE',
  "source" "BrandSportsRelevanceSource" NOT NULL,
  "leagueId" TEXT,
  "teamId" TEXT,
  "venueId" TEXT,
  "marketId" TEXT,
  "priority" "ActivationPriority" NOT NULL DEFAULT 'MEDIUM',
  "rationale" TEXT NOT NULL,
  "ruleVersion" TEXT,
  "validFrom" TIMESTAMP(3),
  "validThrough" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrandSportsRelevance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BrandSportsRelevance_exactly_one_target_check" CHECK (num_nonnulls("leagueId", "teamId", "venueId", "marketId") = 1),
  CONSTRAINT "BrandSportsRelevance_scope_target_check" CHECK (
    ("scope" = 'LEAGUE' AND "leagueId" IS NOT NULL) OR
    ("scope" = 'TEAM' AND "teamId" IS NOT NULL) OR
    ("scope" = 'VENUE' AND "venueId" IS NOT NULL) OR
    ("scope" = 'MARKET' AND "marketId" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "Sport_key_key" ON "Sport"("key");
CREATE UNIQUE INDEX "Sport_code_key" ON "Sport"("code");
CREATE UNIQUE INDEX "League_key_key" ON "League"("key");
CREATE UNIQUE INDEX "League_code_key" ON "League"("code");
CREATE INDEX "League_sportId_active_idx" ON "League"("sportId", "active");

CREATE UNIQUE INDEX "LeagueExternalIdentity_provider_externalId_key" ON "LeagueExternalIdentity"("provider", "externalId");
CREATE UNIQUE INDEX "LeagueExternalIdentity_leagueId_provider_externalId_key" ON "LeagueExternalIdentity"("leagueId", "provider", "externalId");
CREATE INDEX "LeagueExternalIdentity_leagueId_idx" ON "LeagueExternalIdentity"("leagueId");
CREATE UNIQUE INDEX "TeamExternalIdentity_provider_externalId_key" ON "TeamExternalIdentity"("provider", "externalId");
CREATE UNIQUE INDEX "TeamExternalIdentity_teamId_provider_externalId_key" ON "TeamExternalIdentity"("teamId", "provider", "externalId");
CREATE INDEX "TeamExternalIdentity_teamId_idx" ON "TeamExternalIdentity"("teamId");
CREATE UNIQUE INDEX "VenueExternalIdentity_provider_externalId_key" ON "VenueExternalIdentity"("provider", "externalId");
CREATE UNIQUE INDEX "VenueExternalIdentity_venueId_provider_externalId_key" ON "VenueExternalIdentity"("venueId", "provider", "externalId");
CREATE INDEX "VenueExternalIdentity_venueId_idx" ON "VenueExternalIdentity"("venueId");
CREATE UNIQUE INDEX "GrowthEventExternalIdentity_provider_externalId_key" ON "GrowthEventExternalIdentity"("provider", "externalId");
CREATE UNIQUE INDEX "GrowthEventExternalIdentity_eventId_provider_externalId_key" ON "GrowthEventExternalIdentity"("eventId", "provider", "externalId");
CREATE INDEX "GrowthEventExternalIdentity_eventId_idx" ON "GrowthEventExternalIdentity"("eventId");

CREATE UNIQUE INDEX "BrandSportsRelevance_league_unique" ON "BrandSportsRelevance"("brandId", "leagueId", "source") WHERE "leagueId" IS NOT NULL;
CREATE UNIQUE INDEX "BrandSportsRelevance_team_unique" ON "BrandSportsRelevance"("brandId", "teamId", "source") WHERE "teamId" IS NOT NULL;
CREATE UNIQUE INDEX "BrandSportsRelevance_venue_unique" ON "BrandSportsRelevance"("brandId", "venueId", "source") WHERE "venueId" IS NOT NULL;
CREATE UNIQUE INDEX "BrandSportsRelevance_market_unique" ON "BrandSportsRelevance"("brandId", "marketId", "source") WHERE "marketId" IS NOT NULL;
CREATE INDEX "BrandSportsRelevance_brandId_status_scope_idx" ON "BrandSportsRelevance"("brandId", "status", "scope");
CREATE INDEX "BrandSportsRelevance_leagueId_status_idx" ON "BrandSportsRelevance"("leagueId", "status");
CREATE INDEX "BrandSportsRelevance_teamId_status_idx" ON "BrandSportsRelevance"("teamId", "status");
CREATE INDEX "BrandSportsRelevance_venueId_status_idx" ON "BrandSportsRelevance"("venueId", "status");
CREATE INDEX "BrandSportsRelevance_marketId_status_idx" ON "BrandSportsRelevance"("marketId", "status");

CREATE INDEX "Team_leagueId_active_idx" ON "Team"("leagueId", "active");
CREATE INDEX "GrowthEvent_leagueId_seasonId_startsAt_idx" ON "GrowthEvent"("leagueId", "seasonId", "startsAt");
CREATE INDEX "SportsSeason_leagueId_year_idx" ON "SportsSeason"("leagueId", "year");
CREATE INDEX "SportsIngestionRun_leagueId_createdAt_idx" ON "SportsIngestionRun"("leagueId", "createdAt");

ALTER TABLE "League" ADD CONSTRAINT "League_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeagueExternalIdentity" ADD CONSTRAINT "LeagueExternalIdentity_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamExternalIdentity" ADD CONSTRAINT "TeamExternalIdentity_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VenueExternalIdentity" ADD CONSTRAINT "VenueExternalIdentity_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrowthEvent" ADD CONSTRAINT "GrowthEvent_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SportsSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GrowthEventExternalIdentity" ADD CONSTRAINT "GrowthEventExternalIdentity_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandSportsRelevance" ADD CONSTRAINT "BrandSportsRelevance_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandSportsRelevance" ADD CONSTRAINT "BrandSportsRelevance_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandSportsRelevance" ADD CONSTRAINT "BrandSportsRelevance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandSportsRelevance" ADD CONSTRAINT "BrandSportsRelevance_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandSportsRelevance" ADD CONSTRAINT "BrandSportsRelevance_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsSeason" ADD CONSTRAINT "SportsSeason_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportsIngestionRun" ADD CONSTRAINT "SportsIngestionRun_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE SET NULL ON UPDATE CASCADE;
