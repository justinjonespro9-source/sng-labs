-- CreateEnum
CREATE TYPE "SportsParticipantKind" AS ENUM ('PLAYER', 'TEAM_DEFENSE');

-- CreateEnum
CREATE TYPE "FantasyPosition" AS ENUM ('QB', 'RB', 'WR', 'TE', 'DEF');

-- CreateEnum
CREATE TYPE "SportsRosterStatus" AS ENUM ('ACTIVE', 'PRACTICE_SQUAD', 'INJURED_RESERVE', 'PUP', 'SUSPENDED', 'INACTIVE', 'FREE_AGENT', 'OTHER');

-- CreateEnum
CREATE TYPE "SportsIngestionType" AS ENUM ('PLAYER_DIRECTORY', 'SEASON_ROSTER', 'PARTICIPANT_IDENTITY');

-- CreateEnum
CREATE TYPE "SportsIngestionStatus" AS ENUM ('PREVIEWED', 'APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "SportsIngestionRecordStatus" AS ENUM ('CREATE', 'UPDATE', 'UNCHANGED', 'SKIPPED', 'UNRESOLVED', 'ERROR');

-- CreateEnum
CREATE TYPE "SportsDataQualityIssueType" AS ENUM ('UNRESOLVED_IDENTITY', 'AMBIGUOUS_MATCH', 'DUPLICATE_CANDIDATE', 'MISSING_EXTERNAL_MAPPING', 'CONFLICTING_ROSTER_TEAM');

-- CreateEnum
CREATE TYPE "SportsDataQualityIssueStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "SportsSeason" (
    "id" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsParticipant" (
    "id" TEXT NOT NULL,
    "kind" "SportsParticipantKind" NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "birthDate" TIMESTAMP(3),
    "headshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamDefense" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDefense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantExternalIdentity" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "sourceReference" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipantExternalIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantAlias" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "sourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonRosterMembership" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "fantasyPosition" "FantasyPosition" NOT NULL,
    "sourcePosition" TEXT,
    "status" "SportsRosterStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "jerseyNumber" INTEGER,
    "sourceLabel" TEXT,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonRosterMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsIngestionRun" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "seasonId" TEXT,
    "type" "SportsIngestionType" NOT NULL,
    "status" "SportsIngestionStatus" NOT NULL DEFAULT 'PREVIEWED',
    "sourceType" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceReference" TEXT,
    "checksum" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "unchangedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsIngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsIngestionRecord" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "SportsIngestionRecordStatus" NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "participantId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsIngestionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsDataQualityIssue" (
    "id" TEXT NOT NULL,
    "type" "SportsDataQualityIssueType" NOT NULL,
    "status" "SportsDataQualityIssueStatus" NOT NULL DEFAULT 'OPEN',
    "participantId" TEXT,
    "ingestionRunId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SportsDataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SportsSeason_active_league_year_idx" ON "SportsSeason"("active", "league", "year");

-- CreateIndex
CREATE UNIQUE INDEX "SportsSeason_league_year_key" ON "SportsSeason"("league", "year");

-- CreateIndex
CREATE INDEX "SportsParticipant_kind_canonicalName_idx" ON "SportsParticipant"("kind", "canonicalName");

-- CreateIndex
CREATE INDEX "SportsParticipant_active_kind_idx" ON "SportsParticipant"("active", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Player_participantId_key" ON "Player"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDefense_participantId_key" ON "TeamDefense"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDefense_teamId_key" ON "TeamDefense"("teamId");

-- CreateIndex
CREATE INDEX "ParticipantExternalIdentity_participantId_idx" ON "ParticipantExternalIdentity"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantExternalIdentity_provider_externalId_key" ON "ParticipantExternalIdentity"("provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantExternalIdentity_participantId_provider_external_key" ON "ParticipantExternalIdentity"("participantId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "ParticipantAlias_normalizedAlias_idx" ON "ParticipantAlias"("normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantAlias_participantId_normalizedAlias_key" ON "ParticipantAlias"("participantId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "SeasonRosterMembership_seasonId_teamId_active_idx" ON "SeasonRosterMembership"("seasonId", "teamId", "active");

-- CreateIndex
CREATE INDEX "SeasonRosterMembership_participantId_seasonId_idx" ON "SeasonRosterMembership"("participantId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonRosterMembership_seasonId_participantId_teamId_key" ON "SeasonRosterMembership"("seasonId", "participantId", "teamId");

-- CreateIndex
CREATE INDEX "SportsIngestionRun_status_createdAt_idx" ON "SportsIngestionRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SportsIngestionRun_seasonId_createdAt_idx" ON "SportsIngestionRun"("seasonId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SportsIngestionRun_type_checksum_seasonId_key" ON "SportsIngestionRun"("type", "checksum", "seasonId");

-- CreateIndex
CREATE INDEX "SportsIngestionRecord_runId_status_idx" ON "SportsIngestionRecord"("runId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SportsIngestionRecord_runId_rowNumber_key" ON "SportsIngestionRecord"("runId", "rowNumber");

-- CreateIndex
CREATE INDEX "SportsDataQualityIssue_status_type_createdAt_idx" ON "SportsDataQualityIssue"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "SportsDataQualityIssue_participantId_idx" ON "SportsDataQualityIssue"("participantId");

-- CreateIndex
CREATE INDEX "SportsDataQualityIssue_ingestionRunId_idx" ON "SportsDataQualityIssue"("ingestionRunId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDefense" ADD CONSTRAINT "TeamDefense_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDefense" ADD CONSTRAINT "TeamDefense_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantExternalIdentity" ADD CONSTRAINT "ParticipantExternalIdentity_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAlias" ADD CONSTRAINT "ParticipantAlias_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRosterMembership" ADD CONSTRAINT "SeasonRosterMembership_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SportsSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRosterMembership" ADD CONSTRAINT "SeasonRosterMembership_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonRosterMembership" ADD CONSTRAINT "SeasonRosterMembership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsIngestionRun" ADD CONSTRAINT "SportsIngestionRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsIngestionRun" ADD CONSTRAINT "SportsIngestionRun_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SportsSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsIngestionRecord" ADD CONSTRAINT "SportsIngestionRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SportsIngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDataQualityIssue" ADD CONSTRAINT "SportsDataQualityIssue_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDataQualityIssue" ADD CONSTRAINT "SportsDataQualityIssue_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "SportsIngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

