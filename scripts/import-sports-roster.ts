import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { applyRosterImport, previewRosterImport } from "../lib/sports/ingestion";

async function main() {
  const prisma = new PrismaClient();
  const apply = process.argv.includes("--apply");
  const pathArg = process.argv.find((arg) => arg.endsWith(".json")) ?? "data/sports/nfl-2026-rankeyeq-preview-roster.json";
  const raw = await readFile(resolve(pathArg), "utf8");
  const preview = await previewRosterImport(raw, null, prisma);
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "PREVIEW", runId: preview.id, status: preview.status, created: preview.createdCount, updated: preview.updatedCount, unchanged: preview.unchangedCount, unresolved: preview.unresolvedCount, errors: preview.errorCount }, null, 2));
  if (apply) {
    const result = await applyRosterImport(preview.id, null, prisma);
    console.log(JSON.stringify({ runId: result.id, status: result.status, appliedAt: result.appliedAt }, null, 2));
  } else {
    console.log("No records changed. Re-run with --apply after reviewing the preview.");
  }
  await prisma.$disconnect();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
