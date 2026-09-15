ALTER TABLE "ContentDraft"
ADD COLUMN "objective" TEXT,
ADD COLUMN "hook" TEXT,
ADD COLUMN "rationale" TEXT;

UPDATE "ContentDraft" AS draft
SET
  "objective" = angle."objective",
  "hook" = angle."hook",
  "rationale" = angle."rationale"
FROM "BrandAngle" AS angle
WHERE draft."brandAngleId" = angle."id";

ALTER TABLE "ContentDraft"
ALTER COLUMN "objective" SET NOT NULL,
ALTER COLUMN "hook" SET NOT NULL,
ALTER COLUMN "rationale" SET NOT NULL;
