import { calculateNflWeekPreview } from "../lib/sports/scoring/workflow";
import { NFL_HALF_PPR_SNG_V1_CHECKSUM, NFL_SCORING_ENGINE_VERSION } from "../lib/sports/scoring/rules";

const year = Number(process.argv[2] ?? 2026);
const week = Number(process.argv[3]);
if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1) throw new Error("Usage: npm run sports:preview-scoring -- <year> <week>");

const result = await calculateNflWeekPreview({ year, week, mode: "PREVIEW" });
console.log(JSON.stringify({
  runId: result.run.id, replayed: result.replayed, status: result.run.status,
  rulesetChecksum: NFL_HALF_PPR_SNG_V1_CHECKSUM, engineVersion: NFL_SCORING_ENGINE_VERSION,
  inputSetChecksum: result.run.inputSetChecksum, runFingerprint: result.run.runFingerprint,
  inputs: result.run.inputSnapshots.length, derivedPerformances: result.run.derivedPerformances.length,
  resultSets: result.run.weeklyResultSets.map((set) => ({ position: set.positionCode, checksum: set.resultSetChecksum, fieldSize: set.fieldSize })),
}, null, 2));
