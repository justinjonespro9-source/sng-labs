-- Add the terminal non-publishing draft state.
ALTER TYPE "DraftStatus" ADD VALUE 'ARCHIVED';

-- Rename the red health classification while preserving any existing RECOVERY rows.
BEGIN;
CREATE TYPE "HealthState_new" AS ENUM ('HEALTHY', 'WATCH', 'AT_RISK');
ALTER TABLE "SocialAccount" ALTER COLUMN "currentHealth" DROP DEFAULT;
ALTER TABLE "SocialAccount" ALTER COLUMN "currentHealth" TYPE "HealthState_new"
USING (CASE WHEN "currentHealth"::text = 'RECOVERY' THEN 'AT_RISK' ELSE "currentHealth"::text END)::"HealthState_new";
ALTER TABLE "AccountHealthSnapshot" ALTER COLUMN "state" TYPE "HealthState_new"
USING (CASE WHEN "state"::text = 'RECOVERY' THEN 'AT_RISK' ELSE "state"::text END)::"HealthState_new";
ALTER TYPE "HealthState" RENAME TO "HealthState_old";
ALTER TYPE "HealthState_new" RENAME TO "HealthState";
DROP TYPE "HealthState_old";
ALTER TABLE "SocialAccount" ALTER COLUMN "currentHealth" SET DEFAULT 'HEALTHY';
COMMIT;

-- Editable brand-brain context and opportunity assessment.
ALTER TABLE "Brand" ADD COLUMN "contentPillars" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "coreProposition" TEXT,
ADD COLUMN "purpose" TEXT,
ADD COLUMN "shortName" TEXT;

ALTER TABLE "Opportunity" ADD COLUMN "whyItMatters" TEXT;
