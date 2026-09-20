CREATE TYPE "SportsPlayerParticipationStatus" AS ENUM (
  'PARTICIPATED_WITH_STATS',
  'PARTICIPATED_ZERO',
  'DID_NOT_PARTICIPATE',
  'UNKNOWN'
);

ALTER TABLE "NflPlayerEventStat"
ADD COLUMN "participationStatus" "SportsPlayerParticipationStatus" NOT NULL DEFAULT 'UNKNOWN';

CREATE INDEX "NflPlayerEventStat_eventId_participationStatus_idx"
ON "NflPlayerEventStat"("eventId", "participationStatus");
