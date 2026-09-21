import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildNflverseWeekPayloads } from "../lib/sports/nflverse-week";

function arg(name: string) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const week = Number(arg("--week"));
  const playerPath = resolve(arg("--players"));
  const teamPath = resolve(arg("--teams"));
  const snapPath = resolve(arg("--snaps"));
  const rosterPath = resolve(arg("--rosters"));
  const pointsPath = resolve(arg("--points-allowed"));
  const outputDir = resolve(arg("--output-dir"));
  const sourceTimestamp = arg("--source-timestamp");
  const prisma = new PrismaClient();
  try {
    const [playerCsv, teamCsv, snapCsv, rosterCsv, explicitPointsAllowedJson, events] = await Promise.all([
      readFile(playerPath, "utf8"),
      readFile(teamPath, "utf8"),
      readFile(snapPath, "utf8"),
      readFile(rosterPath, "utf8"),
      readFile(pointsPath, "utf8"),
      prisma.growthEvent.findMany({ where: { league: "NFL", season: 2026, week, type: "GAME" }, include: { homeTeam: true, awayTeam: true } }),
    ]);
    const result = buildNflverseWeekPayloads({
      week,
      playerCsv,
      teamCsv,
      snapCsv,
      rosterCsv,
      explicitPointsAllowedJson,
      events: events.map((event) => ({ key: event.key ?? "", week: event.week, homeTeam: event.homeTeam, awayTeam: event.awayTeam })),
      playerSourceReference: "https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2026.csv",
      teamSourceReference: "https://github.com/nflverse/nflverse-data/releases/download/stats_team/stats_team_week_2026.csv",
      snapSourceReference: "https://github.com/nflverse/nflverse-data/releases/download/snap_counts/snap_counts_2026.csv",
      rosterSourceReference: "https://github.com/nflverse/nflverse-data/releases/download/weekly_rosters/roster_weekly_2026.csv",
      sourceTimestamp,
    });
    await mkdir(outputDir, { recursive: true });
    await Promise.all([
      writeFile(resolve(outputDir, `nfl-2026-week-${week}-players.json`), `${JSON.stringify(result.playerPayload, null, 2)}\n`),
      writeFile(resolve(outputDir, `nfl-2026-week-${week}-defenses.json`), `${JSON.stringify(result.defensePayload, null, 2)}\n`),
    ]);
    console.log(JSON.stringify({ outputDir, ...result.report }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
