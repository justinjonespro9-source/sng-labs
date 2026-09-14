import { PrismaClient } from "@prisma/client";
import { brandDefinitions } from "../lib/command-center/brand-definitions";

const prisma = new PrismaClient();

async function main() {
  const brandUrls: Record<string, string[]> = {
    "sng-labs": ["https://www.snglabs.com"],
    "handicap-hero": ["https://www.handicap-hero.com"],
    "stadium-slop": ["https://www.stadiumslop.com"],
    "team-m8tes": ["https://www.team-m8tes.com"],
  };
  for (const brand of brandDefinitions) {
    const persistedBrand = {
      key: brand.key,
      name: brand.name,
      shortName: brand.shortName,
      kind: brand.kind,
      description: brand.description,
      audience: brand.audience,
      voice: brand.voice,
      objectives: brand.objectives,
      preferredContent: brand.preferredContent,
      prohibitedContent: brand.prohibitedContent,
      callToActionRules: brand.callToActionRules,
      visualDirection: brand.visualDirection,
      defaultCadenceNotes: brand.defaultCadenceNotes,
    };
    const existing = await prisma.brand.findUnique({ where: { key: brand.key } });
    await prisma.brand.upsert({
      where: { key: brand.key },
      update: {
        shortName: existing?.shortName ?? brand.shortName,
        purpose: existing?.purpose ?? brand.objectives[0],
        coreProposition: existing?.coreProposition ?? brand.description,
        contentPillars: existing?.contentPillars.length ? existing.contentPillars : brand.preferredContent,
        relevantUrls: existing?.relevantUrls.length ? existing.relevantUrls : (brandUrls[brand.key] ?? []),
      },
      create: { ...persistedBrand, purpose: brand.objectives[0], coreProposition: brand.description, contentPillars: brand.preferredContent, relevantUrls: brandUrls[brand.key] ?? [] },
    });
  }

  const seededBrands = await prisma.brand.findMany({ where: { key: { in: brandDefinitions.map((brand) => brand.key) } }, select: { key: true, active: true } });
  if (seededBrands.length !== brandDefinitions.length) throw new Error(`Expected ${brandDefinitions.length} canonical brands; found ${seededBrands.length}`);
  console.log(`Verified ${seededBrands.length} canonical SNG brand profiles (${seededBrands.filter((brand) => brand.active).length} active).`);

  const brands = await prisma.brand.findMany();
  const brandIds = Object.fromEntries(brands.map((brand) => [brand.key, brand.id]));
  const markets = [
    { key: "minnesota-twin-cities", name: "Minnesota / Twin Cities", region: "Minnesota" },
    { key: "philadelphia", name: "Philadelphia", region: "Pennsylvania" },
  ];
  for (const market of markets) await prisma.market.upsert({ where: { key: market.key }, update: market, create: market });
  const marketRows = await prisma.market.findMany();
  const marketIds = Object.fromEntries(marketRows.map((market) => [market.key, market.id]));
  const teams = [
    ["minnesota-vikings", "Minnesota Vikings", "minnesota-twin-cities", "Football", "NFL", "U.S. Bank Stadium"],
    ["minnesota-twins", "Minnesota Twins", "minnesota-twin-cities", "Baseball", "MLB", "Target Field"],
    ["minnesota-timberwolves", "Minnesota Timberwolves", "minnesota-twin-cities", "Basketball", "NBA", "Target Center"],
    ["minnesota-wild", "Minnesota Wild", "minnesota-twin-cities", "Hockey", "NHL", "Xcel Energy Center"],
    ["minnesota-united", "Minnesota United", "minnesota-twin-cities", "Soccer", "MLS", "Allianz Field"],
    ["minnesota-gophers", "Minnesota Gophers", "minnesota-twin-cities", "College sports", "NCAA", null],
    ["philadelphia-eagles", "Philadelphia Eagles", "philadelphia", "Football", "NFL", "Lincoln Financial Field"],
    ["philadelphia-phillies", "Philadelphia Phillies", "philadelphia", "Baseball", "MLB", "Citizens Bank Park"],
    ["philadelphia-76ers", "Philadelphia 76ers", "philadelphia", "Basketball", "NBA", "Wells Fargo Center"],
    ["philadelphia-flyers", "Philadelphia Flyers", "philadelphia", "Hockey", "NHL", "Wells Fargo Center"],
  ] as const;
  for (const [key, name, marketKey, sport, league, venueName] of teams) {
    await prisma.team.upsert({
      where: { key },
      update: { name, marketId: marketIds[marketKey], sport, league, venueName },
      create: {
        key, name, marketId: marketIds[marketKey], sport, league, venueName,
        brands: { connect: ["rank-eye-q", "handicap-hero", "fantasytrack", "stadium-slop", "team-m8tes"].map((brandKey) => ({ id: brandIds[brandKey] })) },
      },
    });
  }

  await prisma.organization.upsert({
    where: { name: "KFAN" },
    update: { marketId: marketIds["minnesota-twin-cities"] },
    create: {
      name: "KFAN", type: "MEDIA", marketId: marketIds["minnesota-twin-cities"], websiteUrl: "https://www.iheart.com/live/kfan-1209/",
      relevantBrands: { connect: ["rank-eye-q", "handicap-hero", "stadium-slop", "team-m8tes"].map((brandKey) => ({ id: brandIds[brandKey] })) },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
