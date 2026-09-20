ALTER TYPE "SportsIngestionType" ADD VALUE 'PLAYER_EVENT_STATS';
ALTER TYPE "SportsIngestionType" ADD VALUE 'DEFENSE_EVENT_STATS';
ALTER TYPE "SportsIngestionType" ADD VALUE 'EVENT_STAT_CORRECTION';

ALTER TYPE "SportsIngestionRecordStatus" ADD VALUE 'CONFLICT';
ALTER TYPE "SportsIngestionRecordStatus" ADD VALUE 'INVALID';

ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'MISSING_EVENT';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'PARTICIPANT_TEAM_MISMATCH';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'DEFENSE_TEAM_MISMATCH';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'DUPLICATE_PERFORMANCE';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'CONFLICTING_FACTUAL_INPUT';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'INCOMPLETE_EVENT_STATS';
ALTER TYPE "SportsDataQualityIssueType" ADD VALUE 'CORRECTED_STAT';

CREATE TYPE "SportsStatFinality" AS ENUM ('PROVISIONAL', 'FINAL', 'CORRECTED', 'VOID');
CREATE TYPE "SportsStatPerformanceKind" AS ENUM ('PLAYER', 'TEAM_DEFENSE');

ALTER TABLE "SportsIngestionRecord" ADD COLUMN "eventId" TEXT;
ALTER TABLE "SportsDataQualityIssue" ADD COLUMN "eventId" TEXT;

CREATE TABLE "NflPlayerEventStat" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "finality" "SportsStatFinality" NOT NULL DEFAULT 'PROVISIONAL',
    "passingYards" INTEGER,
    "passingTouchdowns" INTEGER,
    "interceptionsThrown" INTEGER,
    "rushingYards" INTEGER,
    "rushingTouchdowns" INTEGER,
    "receptions" INTEGER,
    "receivingYards" INTEGER,
    "receivingTouchdowns" INTEGER,
    "twoPointConversions" INTEGER,
    "fumblesLost" INTEGER,
    "returnTouchdowns" INTEGER,
    "sourceType" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceReference" TEXT,
    "sourceTimestamp" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NflPlayerEventStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NflDefenseEventStat" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "finality" "SportsStatFinality" NOT NULL DEFAULT 'PROVISIONAL',
    "sacks" INTEGER,
    "defensiveInterceptions" INTEGER,
    "fumbleRecoveries" INTEGER,
    "defensiveTouchdowns" INTEGER,
    "specialTeamsTouchdowns" INTEGER,
    "safeties" INTEGER,
    "blockedKicks" INTEGER,
    "pointsAllowed" INTEGER,
    "sourceType" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "sourceReference" TEXT,
    "sourceTimestamp" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NflDefenseEventStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SportsStatRevision" (
    "id" TEXT NOT NULL,
    "kind" "SportsStatPerformanceKind" NOT NULL,
    "playerStatId" TEXT,
    "defenseStatId" TEXT,
    "ingestionRunId" TEXT NOT NULL,
    "correctedById" TEXT,
    "previousValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SportsStatRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NflPlayerEventStat_participantId_eventId_key" ON "NflPlayerEventStat"("participantId", "eventId");
CREATE INDEX "NflPlayerEventStat_eventId_finality_idx" ON "NflPlayerEventStat"("eventId", "finality");
CREATE INDEX "NflPlayerEventStat_participantId_eventId_idx" ON "NflPlayerEventStat"("participantId", "eventId");
CREATE INDEX "NflPlayerEventStat_ingestionRunId_idx" ON "NflPlayerEventStat"("ingestionRunId");
CREATE UNIQUE INDEX "NflDefenseEventStat_participantId_eventId_key" ON "NflDefenseEventStat"("participantId", "eventId");
CREATE INDEX "NflDefenseEventStat_eventId_finality_idx" ON "NflDefenseEventStat"("eventId", "finality");
CREATE INDEX "NflDefenseEventStat_teamId_eventId_idx" ON "NflDefenseEventStat"("teamId", "eventId");
CREATE INDEX "NflDefenseEventStat_ingestionRunId_idx" ON "NflDefenseEventStat"("ingestionRunId");
CREATE INDEX "SportsStatRevision_playerStatId_createdAt_idx" ON "SportsStatRevision"("playerStatId", "createdAt");
CREATE INDEX "SportsStatRevision_defenseStatId_createdAt_idx" ON "SportsStatRevision"("defenseStatId", "createdAt");
CREATE INDEX "SportsStatRevision_ingestionRunId_idx" ON "SportsStatRevision"("ingestionRunId");
CREATE INDEX "SportsIngestionRecord_eventId_idx" ON "SportsIngestionRecord"("eventId");
CREATE INDEX "SportsDataQualityIssue_eventId_idx" ON "SportsDataQualityIssue"("eventId");

ALTER TABLE "NflPlayerEventStat" ADD CONSTRAINT "NflPlayerEventStat_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NflPlayerEventStat" ADD CONSTRAINT "NflPlayerEventStat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NflPlayerEventStat" ADD CONSTRAINT "NflPlayerEventStat_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "SportsIngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NflDefenseEventStat" ADD CONSTRAINT "NflDefenseEventStat_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "SportsParticipant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NflDefenseEventStat" ADD CONSTRAINT "NflDefenseEventStat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NflDefenseEventStat" ADD CONSTRAINT "NflDefenseEventStat_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NflDefenseEventStat" ADD CONSTRAINT "NflDefenseEventStat_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "SportsIngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportsStatRevision" ADD CONSTRAINT "SportsStatRevision_playerStatId_fkey" FOREIGN KEY ("playerStatId") REFERENCES "NflPlayerEventStat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportsStatRevision" ADD CONSTRAINT "SportsStatRevision_defenseStatId_fkey" FOREIGN KEY ("defenseStatId") REFERENCES "NflDefenseEventStat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportsStatRevision" ADD CONSTRAINT "SportsStatRevision_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "SportsIngestionRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SportsStatRevision" ADD CONSTRAINT "SportsStatRevision_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportsIngestionRecord" ADD CONSTRAINT "SportsIngestionRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportsDataQualityIssue" ADD CONSTRAINT "SportsDataQualityIssue_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GrowthEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
