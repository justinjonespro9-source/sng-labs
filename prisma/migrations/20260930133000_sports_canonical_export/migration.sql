-- CreateEnum
CREATE TYPE "SportsCanonicalPublicationState" AS ENUM ('ACCEPTED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "SportsWeeklyCoverageManifest" (
    "id" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "seasonYear" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "observedFingerprint" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "SportsWeeklyCoverageManifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsParticipationEvidence" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventKey" TEXT,
    "state" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,

    CONSTRAINT "SportsParticipationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SportsCanonicalPublication" (
    "id" TEXT NOT NULL,
    "seriesKey" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "scoringRunId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "acceptedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "state" "SportsCanonicalPublicationState" NOT NULL DEFAULT 'ACCEPTED',
    "supersedesId" TEXT,
    "authorityChangedAt" TIMESTAMP(3),
    "authorityReason" TEXT,
    "schemaVersion" TEXT NOT NULL,
    "canonicalBytes" TEXT NOT NULL,
    "contentChecksum" TEXT NOT NULL,
    "readinessChecksum" TEXT NOT NULL,

    CONSTRAINT "SportsCanonicalPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SportsWeeklyCoverageManifest_checksum_key" ON "SportsWeeklyCoverageManifest"("checksum");

-- CreateIndex
CREATE INDEX "SportsWeeklyCoverageManifest_league_seasonYear_week_idx" ON "SportsWeeklyCoverageManifest"("league", "seasonYear", "week");

-- CreateIndex
CREATE UNIQUE INDEX "SportsParticipationEvidence_manifestId_participantId_key" ON "SportsParticipationEvidence"("manifestId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "SportsCanonicalPublication_supersedesId_key" ON "SportsCanonicalPublication"("supersedesId");

-- CreateIndex
CREATE INDEX "SportsCanonicalPublication_seriesKey_state_idx" ON "SportsCanonicalPublication"("seriesKey", "state");

-- CreateIndex
CREATE UNIQUE INDEX "SportsCanonicalPublication_seriesKey_revision_key" ON "SportsCanonicalPublication"("seriesKey", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "SportsCanonicalPublication_seriesKey_scoringRunId_manifestI_key" ON "SportsCanonicalPublication"("seriesKey", "scoringRunId", "manifestId");

-- AddForeignKey
ALTER TABLE "SportsWeeklyCoverageManifest" ADD CONSTRAINT "SportsWeeklyCoverageManifest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsParticipationEvidence" ADD CONSTRAINT "SportsParticipationEvidence_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "SportsWeeklyCoverageManifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsCanonicalPublication" ADD CONSTRAINT "SportsCanonicalPublication_scoringRunId_fkey" FOREIGN KEY ("scoringRunId") REFERENCES "SportsScoringRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsCanonicalPublication" ADD CONSTRAINT "SportsCanonicalPublication_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "SportsWeeklyCoverageManifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsCanonicalPublication" ADD CONSTRAINT "SportsCanonicalPublication_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SportsCanonicalPublication" ADD CONSTRAINT "SportsCanonicalPublication_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "SportsCanonicalPublication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A publication's bytes and authority evidence are append-only. Only authority state may change.
CREATE UNIQUE INDEX "SportsCanonicalPublication_one_current" ON "SportsCanonicalPublication" ("seriesKey") WHERE "state" = 'ACCEPTED';
ALTER TABLE "SportsCanonicalPublication" ADD CONSTRAINT "SportsCanonicalPublication_revision_positive" CHECK ("revision" > 0);
CREATE FUNCTION sng_canonical_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Canonical evidence/publication cannot be deleted'; END IF;
  IF TG_TABLE_NAME <> 'SportsCanonicalPublication' THEN RAISE EXCEPTION 'Canonical evidence is immutable'; END IF;
  IF (to_jsonb(NEW) - ARRAY['state','authorityChangedAt','authorityReason']) IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['state','authorityChangedAt','authorityReason']) THEN
    RAISE EXCEPTION 'Accepted canonical bytes and evidence are immutable';
  END IF;
  IF OLD."state" <> 'ACCEPTED' OR NEW."state" NOT IN ('SUPERSEDED','WITHDRAWN') OR
     NEW."authorityChangedAt" IS NULL OR length(trim(coalesce(NEW."authorityReason",''))) = 0 THEN
    RAISE EXCEPTION 'Invalid canonical authority transition';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "SportsCanonicalPublication_immutable" BEFORE UPDATE OR DELETE ON "SportsCanonicalPublication" FOR EACH ROW EXECUTE FUNCTION sng_canonical_immutable();
CREATE TRIGGER "SportsWeeklyCoverageManifest_immutable" BEFORE UPDATE OR DELETE ON "SportsWeeklyCoverageManifest" FOR EACH ROW EXECUTE FUNCTION sng_canonical_immutable();
CREATE TRIGGER "SportsParticipationEvidence_immutable" BEFORE UPDATE OR DELETE ON "SportsParticipationEvidence" FOR EACH ROW EXECUTE FUNCTION sng_canonical_immutable();
