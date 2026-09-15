import { Prisma, PrismaClient } from "@prisma/client";
import { brandDefinitions } from "../lib/command-center/brand-definitions";
import { shouldInitializeBrandBrain, stadiumSlopBrandBrain, teamM8tesBrandBrain } from "../lib/command-center/brand-brain";
import { campaignDefinitions, growthProgramDefinitions } from "../lib/command-center/campaign-definitions";

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

  const stadiumSlop = await prisma.brand.findUnique({ where: { key: "stadium-slop" } });
  if (!stadiumSlop) throw new Error("Canonical Stadium Slop brand is missing");
  if (shouldInitializeBrandBrain(stadiumSlop.brandBrainVersion)) {
    await prisma.brand.update({
      where: { id: stadiumSlop.id },
      data: {
        purpose: stadiumSlopBrandBrain.purpose,
        corePromise: stadiumSlopBrandBrain.corePromise,
        coreProposition: stadiumSlopBrandBrain.coreProposition,
        audience: stadiumSlopBrandBrain.audience,
        secondaryAudiences: stadiumSlopBrandBrain.secondaryAudiences,
        distributionAudiences: stadiumSlopBrandBrain.distributionAudiences,
        jobsToBeDone: stadiumSlopBrandBrain.jobsToBeDone,
        contentPillars: stadiumSlopBrandBrain.contentPillars,
        voice: stadiumSlopBrandBrain.voice,
        voiceTraits: stadiumSlopBrandBrain.voiceTraits,
        communicationPatterns: stadiumSlopBrandBrain.communicationPatterns,
        contentModes: stadiumSlopBrandBrain.contentModes as Prisma.InputJsonValue,
        prohibitedContent: stadiumSlopBrandBrain.prohibitedContent,
        factualRequirements: stadiumSlopBrandBrain.factualRequirements,
        affiliationRestrictions: stadiumSlopBrandBrain.affiliationRestrictions,
        aiOperatingInstructions: stadiumSlopBrandBrain.aiOperatingInstructions,
        primaryCtas: ["Rate what you ate."],
        callToActionRules: "Use the supported attendee, creator, media, vendor, or partner CTA from context. Do not default to download-our-app language.",
        brandBrainVersion: 1,
        brandBrainConfiguredAt: new Date(),
      },
    });
    console.log("Configured canonical Stadium Slop Brand Brain v1.");
  } else {
    console.log(`Preserved operator-managed Stadium Slop Brand Brain v${stadiumSlop.brandBrainVersion}.`);
  }

  const teamM8tes = await prisma.brand.findUnique({ where: { key: "team-m8tes" } });
  if (!teamM8tes) throw new Error("Canonical Team-M8tes brand is missing");
  if (shouldInitializeBrandBrain(teamM8tes.brandBrainVersion)) {
    await prisma.brand.update({
      where: { id: teamM8tes.id },
      data: {
        purpose: teamM8tesBrandBrain.purpose,
        corePromise: teamM8tesBrandBrain.corePromise,
        coreProposition: teamM8tesBrandBrain.coreProposition,
        audience: teamM8tesBrandBrain.audience,
        secondaryAudiences: teamM8tesBrandBrain.secondaryAudiences,
        distributionAudiences: teamM8tesBrandBrain.distributionAudiences,
        jobsToBeDone: teamM8tesBrandBrain.jobsToBeDone,
        contentPillars: teamM8tesBrandBrain.contentPillars,
        voice: teamM8tesBrandBrain.voice,
        voiceTraits: teamM8tesBrandBrain.voiceTraits,
        communicationPatterns: teamM8tesBrandBrain.communicationPatterns,
        contentModes: teamM8tesBrandBrain.contentModes as Prisma.InputJsonValue,
        prohibitedContent: teamM8tesBrandBrain.prohibitedContent,
        factualRequirements: teamM8tesBrandBrain.factualRequirements,
        affiliationRestrictions: teamM8tesBrandBrain.affiliationRestrictions,
        aiOperatingInstructions: teamM8tesBrandBrain.aiOperatingInstructions,
        primaryCtas: ["Find your person through the teams you love."],
        callToActionRules: "Keep dating visible for consumer acquisition. Use game-day connection when context supports it, and tailor creator, media, community, and partner outreach rather than copying consumer posts.",
        brandBrainVersion: 1,
        brandBrainConfiguredAt: new Date(),
      },
    });
    console.log("Configured canonical Team-M8tes Brand Brain v1.");
  } else {
    console.log(`Preserved operator-managed Team-M8tes Brand Brain v${teamM8tes.brandBrainVersion}.`);
  }

  const brands = await prisma.brand.findMany();
  const brandIds = Object.fromEntries(brands.map((brand) => [brand.key, brand.id]));
  for (const program of growthProgramDefinitions) {
    await prisma.growthProgram.upsert({
      where: { key: program.key },
      update: { name: program.name, brands: { connect: program.brandKeys.map((key) => ({ id: brandIds[key] })) } },
      create: { key: program.key, name: program.name, description: program.description, operatingDescription: program.operatingDescription, brands: { connect: program.brandKeys.map((key) => ({ id: brandIds[key] })) } },
    });
  }
  const programRows = await prisma.growthProgram.findMany();
  const programIds = Object.fromEntries(programRows.map((program) => [program.key, program.id]));
  for (const [key, programKey, name, brandKey, objectiveType, objective, primaryAudience, primaryCta, coreMessage, successDefinition, kpis] of campaignDefinitions) {
    const existing = await prisma.campaign.findUnique({ where: { key } }) ?? await prisma.campaign.findFirst({ where: { key: null, name } });
    if (existing) {
      await prisma.campaign.update({ where: { id: existing.id }, data: { key, programId: programIds[programKey], brands: { connect: { id: brandIds[brandKey] } } } });
    } else {
      await prisma.campaign.create({ data: { key, programId: programIds[programKey], name, objectiveType, objective, primaryAudience, primaryCta, coreMessage, successDefinition, kpis: [...kpis], status: "ACTIVE", brands: { connect: { id: brandIds[brandKey] } } } });
    }
  }
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

  const [stadiumCampaign, vikings] = await Promise.all([
    prisma.campaign.findUnique({ where: { key: "nfl-stadium-food-rankings" } }),
    prisma.team.findUnique({ where: { key: "minnesota-vikings" } }),
  ]);
  if (stadiumCampaign && vikings) {
    await prisma.campaignActivation.upsert({
      where: { key: "nfl-stadium-food-rankings-minnesota-vikings" },
      update: { campaignId: stadiumCampaign.id, marketId: vikings.marketId, teamId: vikings.id, venueName: vikings.venueName, brands: { connect: [{ id: brandIds["stadium-slop"] }, { id: brandIds["team-m8tes"] }] } },
      create: {
        key: "nfl-stadium-food-rankings-minnesota-vikings",
        campaignId: stadiumCampaign.id,
        name: "Minnesota Vikings / U.S. Bank Stadium",
        status: "READY",
        priority: "HIGH",
        marketId: vikings.marketId,
        teamId: vikings.id,
        venueName: vikings.venueName,
        sport: "NFL",
        season: "2026",
        audienceSegment: "Vikings game attendees and Minnesota sports fans",
        coreMessage: "What is actually worth eating at U.S. Bank Stadium?",
        callToAction: "Rate what you ate.",
        objective: "Build the primary local proving ground for verified NFL stadium food ratings.",
        brands: { connect: [{ id: brandIds["stadium-slop"] }, { id: brandIds["team-m8tes"] }] },
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
