import { PrismaClient } from "@prisma/client";
import { brandDefinitions } from "../lib/command-center/brand-definitions";

const prisma = new PrismaClient();

async function main() {
  for (const brand of brandDefinitions) {
    await prisma.brand.upsert({
      where: { key: brand.key },
      update: brand,
      create: brand,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
