import { PrismaClient } from "@prisma/client";
import { importNflSchedule } from "../lib/game-day/nfl-import";
import { loadNflFixture } from "../lib/game-day/nfl-fixture";

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes("--apply");
  const fixture = loadNflFixture();
  const summary = await importNflSchedule(prisma, fixture, { apply });
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) console.log("Dry run only. Re-run with --apply to write canonical NFL foundation and events.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
