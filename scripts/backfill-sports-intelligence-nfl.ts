import { PrismaClient } from "@prisma/client";
import { applyNflNormalization, inspectNflNormalization } from "../lib/sports-intelligence/nfl-backfill";

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(JSON.stringify(apply ? await applyNflNormalization(prisma) : await inspectNflNormalization(prisma), null, 2));
}

main().finally(() => prisma.$disconnect());
