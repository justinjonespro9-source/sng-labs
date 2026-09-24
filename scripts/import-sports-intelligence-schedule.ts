import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { applyScheduleRun, previewSchedulePackage } from "../lib/sports-intelligence/schedule-import";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const applyIndex = args.indexOf("--apply-run");
  if (applyIndex >= 0) {
    const runId = args[applyIndex + 1];
    if (!runId) throw new Error("--apply-run requires an exact preview run ID");
    console.log(JSON.stringify(await applyScheduleRun(prisma, runId), null, 2));
    return;
  }
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) throw new Error("Usage: npm run sports-intelligence:import-schedule -- <versioned.json> [--preview] | --apply-run <runId>");
  const payload = JSON.parse(await readFile(resolve(file), "utf8")) as unknown;
  const result = await previewSchedulePackage(prisma, payload);
  console.log(JSON.stringify({ runId: result.run.id, checksum: result.plan.checksum, status: result.run.status, reused: result.reused, creates: result.plan.creates, updates: result.plan.updates, unchanged: result.plan.unchanged }, null, 2));
}

main().finally(() => prisma.$disconnect());
