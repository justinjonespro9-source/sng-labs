-- NCAAF is the canonical league identity; subdivision is a program-level attribute.
ALTER TABLE "Team" ADD COLUMN "subdivision" TEXT;
CREATE INDEX "Team_leagueId_subdivision_active_idx" ON "Team"("leagueId", "subdivision", "active");
