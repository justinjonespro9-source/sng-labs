import { describe, expect, it } from "vitest";
import { buildNflverseWeekPayloads } from "./nflverse-week";

const eventKey = "nfl-2026-week-1-atl-pit";
const playerHeader = "player_id,player_name,player_display_name,position,season,week,season_type,game_id,team,passing_yards,passing_tds,passing_interceptions,rushing_yards,rushing_tds,receptions,receiving_yards,receiving_tds,passing_2pt_conversions,rushing_2pt_conversions,receiving_2pt_conversions,fumbles_lost_total,special_teams_tds,def_tds";
const playerCsv = `${playerHeader}\n00-1,A.Player,Active Player,RB,2026,1,REG,2026_01_ATL_PIT,ATL,0,0,0,40,1,2,10,0,0,0,0,0,0,0\n00-2,Z.Player,Zero Player,WR,2026,1,REG,2026_01_ATL_PIT,PIT,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n`;
const teamHeader = "season,week,team,season_type,game_id,def_sacks,def_interceptions,fumble_recovery_opp,def_tds,special_teams_tds,def_safeties,def_punt_blocks,def_pat_blocks,def_fg_blocks";
const teamCsv = `${teamHeader}\n2026,1,ATL,REG,2026_01_ATL_PIT,2,1,0,0,0,0,0,0,0\n2026,1,PIT,REG,2026_01_ATL_PIT,3,0,1,0,0,0,0,0,0\n`;
const snapCsv = "game_id,season,game_type,week,player,pfr_player_id,position,team,offense_snaps\n2026_01_ATL_PIT,2026,REG,1,Active Player,ActiPl01,RB,ATL,20\n2026_01_ATL_PIT,2026,REG,1,Zero Player,ZeroPl01,WR,PIT,12\n2026_01_ATL_PIT,2026,REG,1,Snap Only,SnapOn01,TE,ATL,4\n";
const rosterCsv = "season,team,position,full_name,gsis_id,pfr_id,week,game_type,football_name\n2026,ATL,RB,Active Player,00-1,ActiPl01,1,REG,Active\n2026,PIT,WR,Zero Player,00-2,ZeroPl01,1,REG,Zero\n2026,ATL,TE,Snap Only,00-3,SnapOn01,1,REG,Snap\n";
const points = (rows = [
  { gameId: "2026_01_ATL_PIT", teamAbbreviation: "ATL", pointsAllowed: 17 },
  { gameId: "2026_01_ATL_PIT", teamAbbreviation: "PIT", pointsAllowed: 20 },
]) => JSON.stringify({
  league: "NFL", year: 2026, week: 1,
  sourceLabel: "Official gamebook review",
  sourceReference: "operator://week-1-gamebooks",
  sourceTimestamp: "2026-09-13T23:00:00.000Z",
  rows,
});

const input = (explicitPointsAllowedJson = points()) => ({
  week: 1, playerCsv, teamCsv, snapCsv, rosterCsv, explicitPointsAllowedJson,
  events: [{ key: eventKey, week: 1, awayTeam: { abbreviation: "ATL" }, homeTeam: { abbreviation: "PIT" } }],
  playerSourceReference: "https://example.test/players.csv",
  teamSourceReference: "https://example.test/teams.csv",
  snapSourceReference: "https://example.test/snaps.csv",
  rosterSourceReference: "https://example.test/rosters.csv",
  sourceTimestamp: "2026-09-14T00:00:00.000Z",
});

describe("nflverse Week adapter", () => {
  it("creates complete player and two-defense payloads with explicit participation", () => {
    const result = buildNflverseWeekPayloads(input());
    expect(result.report).toMatchObject({ games: 1, teams: 2, playerPerformances: 3, playerZeroPerformances: 2, defensePerformances: 2, explicitPointsAllowed: 2 });
    expect(result.playerPayload.rows.map((row) => row.kind === "PLAYER" && row.participationStatus)).toEqual(["PARTICIPATED_WITH_STATS", "PARTICIPATED_ZERO", "PARTICIPATED_ZERO"]);
    expect(result.defensePayload.rows.map((row) => row.kind === "TEAM_DEFENSE" && row.pointsAllowed)).toEqual([17, 20]);
  });

  it("blocks a defense payload unless every team has explicit pointsAllowed", () => {
    expect(() => buildNflverseWeekPayloads(input(points([
      { gameId: "2026_01_ATL_PIT", teamAbbreviation: "ATL", pointsAllowed: 17 },
      { gameId: "2026_01_ATL_PIT", teamAbbreviation: "GB", pointsAllowed: 20 },
    ])))).toThrow("Missing explicit pointsAllowed");
  });

  it("blocks unresolved canonical events", () => {
    expect(() => buildNflverseWeekPayloads({ ...input(), events: [] })).toThrow("Could not resolve one canonical GrowthEvent");
  });
});
