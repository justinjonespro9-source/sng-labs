import { calculateNflWeekPreview } from "../lib/sports/scoring/workflow";

const expectedBranch = "codex/v1d-canonical-scoring-recovery";
const expectedHost = "ep-wispy-dust-aw8e7v4o-pooler.c-12.us-east-1.aws.neon.tech";

if (process.env.VERCEL_ENV !== "preview" || process.env.VERCEL_GIT_COMMIT_REF !== expectedBranch) {
  console.log("V1D Preview verification skipped outside the authorized recovery Preview branch.");
} else {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("V1D Preview verification requires DATABASE_URL");
  const target = new URL(databaseUrl);
  if (target.hostname !== expectedHost || target.pathname !== "/neondb") {
    throw new Error(`V1D Preview database safety gate refused ${target.hostname}${target.pathname}`);
  }
  for (const week of [1, 2]) {
    const first = await calculateNflWeekPreview({ year: 2026, week, mode: "PREVIEW" });
    const replay = await calculateNflWeekPreview({ year: 2026, week, mode: "PREVIEW" });
    if (first.run.id !== replay.run.id || !replay.replayed) throw new Error(`Week ${week} replay was not idempotent`);
    console.log(JSON.stringify({ marker: "V1D_PREVIEW_RESULT", week, runId: first.run.id, replayed: replay.replayed, inputs: first.run.inputSnapshots.length, derived: first.run.derivedPerformances.length, resultSets: first.run.weeklyResultSets.length, inputSetChecksum: first.run.inputSetChecksum, runFingerprint: first.run.runFingerprint }));
  }
}
