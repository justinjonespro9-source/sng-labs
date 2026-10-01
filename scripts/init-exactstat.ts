import { PrismaClient } from "@prisma/client";
import { initializeExactStat, planExactStatInitialization } from "../lib/growth/exactstat";

const PRODUCTION_HOST_FRAGMENT = "ep-snowy-star-awqzs6ol";

function targetHost() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  return new URL(value).hostname;
}

/**
 * Narrow ExactStat onboarding. Dry run by default; --apply writes.
 * Production requires the explicit, separately approved flag --approved-production-host=<host>.
 */
async function main() {
  const apply = process.argv.includes("--apply");
  const hostname = targetHost();
  const approvedHost = process.argv.find((arg) => arg.startsWith("--approved-production-host="))?.split("=")[1] ?? null;
  const isProduction = hostname.includes(PRODUCTION_HOST_FRAGMENT) || process.env.VERCEL_ENV === "production";
  if (isProduction && approvedHost !== hostname) throw new Error("STOP: Production database detected. ExactStat initialization in Production requires separate approval and --approved-production-host matching the target host.");

  const prisma = new PrismaClient();
  try {
    const plan = await planExactStatInitialization(prisma);
    console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", host: hostname, plan }, null, 2));
    if (!apply) {
      console.log("Dry run only. Re-run with --apply to perform the steps above.");
      return;
    }
    const result = await initializeExactStat(prisma);
    console.log(JSON.stringify({ applied: result.performed, brandId: result.brandId }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
