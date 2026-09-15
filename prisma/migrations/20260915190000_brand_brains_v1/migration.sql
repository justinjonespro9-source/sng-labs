-- AlterTable
ALTER TABLE "Brand"
ADD COLUMN "corePromise" TEXT,
ADD COLUMN "secondaryAudiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "distributionAudiences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "jobsToBeDone" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "voiceTraits" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "communicationPatterns" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "factualRequirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "affiliationRestrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "contentModes" JSONB,
ADD COLUMN "aiOperatingInstructions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "brandBrainVersion" INTEGER,
ADD COLUMN "brandBrainConfiguredAt" TIMESTAMP(3);
