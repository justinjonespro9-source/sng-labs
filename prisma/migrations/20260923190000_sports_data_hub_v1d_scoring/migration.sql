-- CreateEnum
CREATE TYPE "SportsScoringRulesetStatus" AS ENUM ('DRAFT', 'SHADOW', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SportsScoringRunMode" AS ENUM ('PREVIEW', 'SHADOW', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SportsScoringRunStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SportsDerivedResultFinality" AS ENUM ('PROVISIONAL', 'FINAL', 'SUPERSEDED', 'VOID');

-- CreateEnum
CREATE TYPE "SportsWeeklyResultCategory" AS ENUM ('POSITION');

-- CreateTable
CREATE TABLE "SportsScoringRuleset" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT,
    "status" "SportsScoringRulesetStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "definitionChecksum" TEXT NOT NULL,
    "engineFamily" TEXT NOT NULL,
    "minimumEngineVersion" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsScoringRuleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsScoringRun" (
    "id" TEXT NOT NULL,
    "createdById" TEXT,
    "seasonId" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "mode" "SportsScoringRunMode" NOT NULL,
    "status" "SportsScoringRunStatus" NOT NULL DEFAULT 'PENDING',
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "rulesetChecksum" TEXT NOT NULL,
    "inputSetChecksum" TEXT NOT NULL,
    "runFingerprint" TEXT NOT NULL,
    "expectedInputCount" INTEGER NOT NULL DEFAULT 0,
    "calculatedCount" INTEGER NOT NULL DEFAULT 0,
    "resultSetCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SportsScoringRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsScoringInputSnapshot" (
    "id" TEXT NOT NULL,
    "scoringRunId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "performanceKind" "SportsStatPerformanceKind" NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourceIngestionRunId" TEXT NOT NULL,
    "sourceRevisionId" TEXT,
    "sourceRevisionFingerprint" TEXT NOT NULL,
    "sourceFinality" "SportsStatFinality" NOT NULL,
    "normalizedFacts" JSONB NOT NULL,
    "inputChecksum" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsScoringInputSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsDerivedPerformance" (
    "id" TEXT NOT NULL,
    "scoringRunId" TEXT NOT NULL,
    "inputSnapshotId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "rulesetChecksum" TEXT NOT NULL,
    "pointsHundredths" INTEGER NOT NULL,
    "fantasyPoints" DECIMAL(10,2) NOT NULL,
    "componentBreakdown" JSONB NOT NULL,
    "finality" "SportsDerivedResultFinality" NOT NULL,
    "resultFingerprint" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsDerivedPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsWeeklyResultSet" (
    "id" TEXT NOT NULL,
    "scoringRunId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "category" "SportsWeeklyResultCategory" NOT NULL DEFAULT 'POSITION',
    "positionCode" TEXT NOT NULL,
    "eligibilityPolicyVersion" TEXT NOT NULL,
    "inputSetChecksum" TEXT NOT NULL,
    "resultSetChecksum" TEXT NOT NULL,
    "finality" "SportsDerivedResultFinality" NOT NULL,
    "fieldSize" INTEGER NOT NULL,
    "sourceComplete" BOOLEAN NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsWeeklyResultSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsWeeklyResultEntry" (
    "id" TEXT NOT NULL,
    "resultSetId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "derivedPerformanceId" TEXT NOT NULL,
    "positionCode" TEXT NOT NULL,
    "pointsHundredths" INTEGER NOT NULL,
    "fantasyPoints" DECIMAL(10,2) NOT NULL,
    "competitionRank" INTEGER NOT NULL,
    "tieGroupKey" TEXT NOT NULL,
    "tieGroupSize" INTEGER NOT NULL,
    "displayOrdinal" INTEGER NOT NULL,
    "fieldSize" INTEGER NOT NULL,
    "isTop3" BOOLEAN NOT NULL,
    "isTop10" BOOLEAN NOT NULL,
    "isTop15" BOOLEAN NOT NULL,
    "eligibilityEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SportsWeeklyResultEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportsScoringRuleset_definitionChecksum_key" ON "SportsScoringRuleset"("definitionChecksum");

-- CreateIndex
CREATE INDEX "SportsScoringRuleset_sport_league_status_idx" ON "SportsScoringRuleset"("sport", "league", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SportsScoringRuleset_code_version_key" ON "SportsScoringRuleset"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SportsScoringRun_runFingerprint_key" ON "SportsScoringRun"("runFingerprint");

-- CreateIndex
CREATE INDEX "SportsScoringRun_seasonId_week_mode_createdAt_idx" ON "SportsScoringRun"("seasonId", "week", "mode", "createdAt");

-- CreateIndex
CREATE INDEX "SportsScoringRun_rulesetId_status_createdAt_idx" ON "SportsScoringRun"("rulesetId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SportsScoringInputSnapshot_participantId_eventId_idx" ON "SportsScoringInputSnapshot"("participantId", "eventId");

-- CreateIndex
CREATE INDEX "SportsScoringInputSnapshot_sourceEntityType_sourceEntityId__idx" ON "SportsScoringInputSnapshot"("sourceEntityType", "sourceEntityId", "sourceRevisionFingerprint");

-- CreateIndex
CREATE INDEX "SportsScoringInputSnapshot_inputChecksum_idx" ON "SportsScoringInputSnapshot"("inputChecksum");

-- CreateIndex
CREATE UNIQUE INDEX "SportsScoringInputSnapshot_scoringRunId_sourceEntityType_so_key" ON "SportsScoringInputSnapshot"("scoringRunId", "sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsDerivedPerformance_inputSnapshotId_key" ON "SportsDerivedPerformance"("inputSnapshotId");

-- CreateIndex
CREATE INDEX "SportsDerivedPerformance_participantId_eventId_calculatedAt_idx" ON "SportsDerivedPerformance"("participantId", "eventId", "calculatedAt");

-- CreateIndex
CREATE INDEX "SportsDerivedPerformance_rulesetId_finality_calculatedAt_idx" ON "SportsDerivedPerformance"("rulesetId", "finality", "calculatedAt");

-- CreateIndex
CREATE INDEX "SportsDerivedPerformance_supersedesId_idx" ON "SportsDerivedPerformance"("supersedesId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsDerivedPerformance_scoringRunId_resultFingerprint_key" ON "SportsDerivedPerformance"("scoringRunId", "resultFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "SportsWeeklyResultSet_resultSetChecksum_key" ON "SportsWeeklyResultSet"("resultSetChecksum");

-- CreateIndex
CREATE INDEX "SportsWeeklyResultSet_seasonId_week_positionCode_idx" ON "SportsWeeklyResultSet"("seasonId", "week", "positionCode");

-- CreateIndex
CREATE INDEX "SportsWeeklyResultSet_rulesetId_finality_generatedAt_idx" ON "SportsWeeklyResultSet"("rulesetId", "finality", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SportsWeeklyResultSet_scoringRunId_category_positionCode_key" ON "SportsWeeklyResultSet"("scoringRunId", "category", "positionCode");

-- CreateIndex
CREATE INDEX "SportsWeeklyResultEntry_resultSetId_competitionRank_display_idx" ON "SportsWeeklyResultEntry"("resultSetId", "competitionRank", "displayOrdinal");

-- CreateIndex
CREATE INDEX "SportsWeeklyResultEntry_participantId_resultSetId_idx" ON "SportsWeeklyResultEntry"("participantId", "resultSetId");

-- CreateIndex
CREATE INDEX "SportsWeeklyResultEntry_derivedPerformanceId_idx" ON "SportsWeeklyResultEntry"("derivedPerformanceId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsWeeklyResultEntry_resultSetId_participantId_key" ON "SportsWeeklyResultEntry"("resultSetId", "participantId");

-- AddForeignKey
ALTER TABLE "SportsScoringRun" ADD CONSTRAINT "SportsScoringRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsScoringRun" ADD CONSTRAINT "SportsScoringRun_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SportsSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsScoringRun" ADD CONSTRAINT "SportsScoringRun_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "SportsScoringRuleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsScoringInputSnapshot" ADD CONSTRAINT "SportsScoringInputSnapshot_scoringRunId_fkey" FOREIGN KEY ("scoringRunId") REFERENCES "SportsScoringRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsScoringInputSnapshot" ADD CONSTRAINT "SportsScoringInputSnapshot_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsScoringInputSnapshot" ADD CONSTRAINT "SportsScoringInputSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDerivedPerformance" ADD CONSTRAINT "SportsDerivedPerformance_scoringRunId_fkey" FOREIGN KEY ("scoringRunId") REFERENCES "SportsScoringRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDerivedPerformance" ADD CONSTRAINT "SportsDerivedPerformance_inputSnapshotId_fkey" FOREIGN KEY ("inputSnapshotId") REFERENCES "SportsScoringInputSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDerivedPerformance" ADD CONSTRAINT "SportsDerivedPerformance_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDerivedPerformance" ADD CONSTRAINT "SportsDerivedPerformance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDerivedPerformance" ADD CONSTRAINT "SportsDerivedPerformance_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "SportsScoringRuleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsDerivedPerformance" ADD CONSTRAINT "SportsDerivedPerformance_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "SportsDerivedPerformance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsWeeklyResultSet" ADD CONSTRAINT "SportsWeeklyResultSet_scoringRunId_fkey" FOREIGN KEY ("scoringRunId") REFERENCES "SportsScoringRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsWeeklyResultSet" ADD CONSTRAINT "SportsWeeklyResultSet_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "SportsSeason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsWeeklyResultSet" ADD CONSTRAINT "SportsWeeklyResultSet_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "SportsScoringRuleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsWeeklyResultEntry" ADD CONSTRAINT "SportsWeeklyResultEntry_resultSetId_fkey" FOREIGN KEY ("resultSetId") REFERENCES "SportsWeeklyResultSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsWeeklyResultEntry" ADD CONSTRAINT "SportsWeeklyResultEntry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsWeeklyResultEntry" ADD CONSTRAINT "SportsWeeklyResultEntry_derivedPerformanceId_fkey" FOREIGN KEY ("derivedPerformanceId") REFERENCES "SportsDerivedPerformance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

