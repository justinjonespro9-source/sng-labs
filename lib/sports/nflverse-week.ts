import { createHash } from "node:crypto";
import { z } from "zod";
import { parseCsv } from "./csv";
import { normalizeNflTeamAbbreviation } from "./import-schema";
import { normalizeParticipantName } from "./identity";
import { eventStatPayloadSchema, PLAYER_STAT_FIELDS, SPORTS_STAT_IMPORT_VERSION } from "./stat-import-schema";

const NFLVERSE_PROVIDER = "nflverse-gsis";
const POSITIONS = new Set(["QB", "RB", "WR", "TE"]);

export const explicitPointsAllowedSchema = z.object({
  league: z.literal("NFL"),
  year: z.literal(2026),
  week: z.number().int().min(1).max(22),
  sourceLabel: z.string().trim().min(1),
  sourceReference: z.string().trim().min(1),
  sourceTimestamp: z.iso.datetime(),
  rows: z.array(z.object({
    gameId: z.string().regex(/^2026_\d{2}_[A-Z]{2,3}_[A-Z]{2,3}$/),
    teamAbbreviation: z.string().transform(normalizeNflTeamAbbreviation),
    pointsAllowed: z.number().int().min(0),
  })).min(2),
}).superRefine((payload, context) => {
  const keys = new Set<string>();
  payload.rows.forEach((row, index) => {
    const key = `${row.gameId}|${row.teamAbbreviation}`;
    if (keys.has(key)) context.addIssue({ code: "custom", path: ["rows", index], message: `Duplicate points-allowed fact ${key}` });
    keys.add(key);
  });
});

export type CanonicalNflEvent = {
  key: string;
  week: number | null;
  homeTeam: { abbreviation: string | null } | null;
  awayTeam: { abbreviation: string | null } | null;
};

function n(row: Record<string, string>, key: string) {
  const value = Number(row[key] || 0);
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric ${key}: ${row[key]}`);
  return Math.round(value);
}

function normalizeTeam(value: string) {
  if (value === "LA") return "LAR";
  return normalizeNflTeamAbbreviation(value);
}

function gameTeams(gameId: string) {
  const match = /^2026_(\d{2})_([A-Z]{2,3})_([A-Z]{2,3})$/.exec(gameId);
  if (!match) throw new Error(`Unexpected nflverse game_id ${gameId}`);
  return { week: Number(match[1]), away: normalizeTeam(match[2]), home: normalizeTeam(match[3]) };
}

function checksum(parts: string[]) {
  const hash = createHash("sha256");
  for (const part of parts) hash.update(part).update("\0");
  return `sha256:${hash.digest("hex")}`;
}

export function buildNflverseWeekPayloads(input: {
  week: number;
  playerCsv: string;
  teamCsv: string;
  snapCsv: string;
  rosterCsv: string;
  explicitPointsAllowedJson: string;
  events: CanonicalNflEvent[];
  playerSourceReference: string;
  teamSourceReference: string;
  snapSourceReference: string;
  rosterSourceReference: string;
  sourceTimestamp: string;
}) {
  const playerRows = parseCsv(input.playerCsv).filter((row) => Number(row.season) === 2026 && Number(row.week) === input.week && row.season_type === "REG" && POSITIONS.has(row.position));
  const teamRows = parseCsv(input.teamCsv).filter((row) => Number(row.season) === 2026 && Number(row.week) === input.week && row.season_type === "REG");
  const snapRows = parseCsv(input.snapCsv).filter((row) => Number(row.season) === 2026 && Number(row.week) === input.week && row.game_type === "REG" && POSITIONS.has(row.position) && n(row, "offense_snaps") > 0);
  const rosterRows = parseCsv(input.rosterCsv).filter((row) => Number(row.season) === 2026 && Number(row.week) === input.week && row.game_type === "REG" && POSITIONS.has(row.position));
  const points = explicitPointsAllowedSchema.parse(JSON.parse(input.explicitPointsAllowedJson));
  if (points.week !== input.week) throw new Error(`Points-allowed input is Week ${points.week}, not Week ${input.week}`);

  const eventByGameId = new Map<string, CanonicalNflEvent>();
  for (const gameId of new Set([...playerRows, ...teamRows].map((row) => row.game_id))) {
    const teams = gameTeams(gameId);
    const matches = input.events.filter((event) => event.week === input.week && normalizeTeam(event.homeTeam?.abbreviation ?? "") === teams.home && normalizeTeam(event.awayTeam?.abbreviation ?? "") === teams.away);
    if (matches.length !== 1 || !matches[0].key) throw new Error(`Could not resolve one canonical GrowthEvent for ${gameId}`);
    eventByGameId.set(gameId, matches[0]);
  }

  const relevant = (row: Record<string, string>) => ({
    passingYards: n(row, "passing_yards"),
    passingTouchdowns: n(row, "passing_tds"),
    interceptionsThrown: n(row, "passing_interceptions"),
    rushingYards: n(row, "rushing_yards"),
    rushingTouchdowns: n(row, "rushing_tds"),
    receptions: n(row, "receptions"),
    receivingYards: n(row, "receiving_yards"),
    receivingTouchdowns: n(row, "receiving_tds"),
    twoPointConversions: n(row, "passing_2pt_conversions") + n(row, "rushing_2pt_conversions") + n(row, "receiving_2pt_conversions"),
    fumblesLost: n(row, "fumbles_lost_total"),
    returnTouchdowns: n(row, "special_teams_tds") + n(row, "def_tds"),
  });
  const playerById = new Map(playerRows.map((row) => [row.player_id, row]));
  const rosterByPfrTeam = new Map(rosterRows.filter((row) => row.pfr_id && row.gsis_id).map((row) => [`${normalizeTeam(row.team)}|${row.pfr_id}`, row]));
  for (const snap of snapRows) {
    const rosterByPfr = rosterByPfrTeam.get(`${normalizeTeam(snap.team)}|${snap.pfr_player_id}`);
    const fallback = rosterRows.filter((row) => row.gsis_id
      && normalizeTeam(row.team) === normalizeTeam(snap.team)
      && row.position === snap.position
      && normalizeParticipantName(row.full_name) === normalizeParticipantName(snap.player));
    const roster = rosterByPfr ?? (fallback.length === 1 ? fallback[0] : undefined);
    if (!roster) throw new Error(`Could not map snap participant ${snap.player} (${snap.pfr_player_id}) to an NFL weekly roster identity`);
    if (!playerById.has(roster.gsis_id)) {
      playerById.set(roster.gsis_id, {
        player_id: roster.gsis_id,
        player_name: roster.football_name || roster.full_name,
        player_display_name: roster.full_name,
        position: roster.position,
        season: "2026",
        week: String(input.week),
        season_type: "REG",
        game_id: snap.game_id,
        team: normalizeTeam(snap.team),
      });
    }
  }
  const playerFacts = [...playerById.values()].map((row) => {
    const facts = relevant(row);
    const allZero = PLAYER_STAT_FIELDS.every((field) => facts[field] === 0);
    return {
      kind: "PLAYER" as const,
      eventKey: eventByGameId.get(row.game_id)!.key,
      provider: NFLVERSE_PROVIDER,
      externalId: row.player_id,
      canonicalName: row.player_display_name || row.player_name,
      teamAbbreviation: normalizeTeam(row.team),
      fantasyPosition: row.position as "QB" | "RB" | "WR" | "TE",
      participationStatus: allZero ? "PARTICIPATED_ZERO" as const : "PARTICIPATED_WITH_STATS" as const,
      finality: "FINAL" as const,
      ...facts,
    };
  });

  const pointByTeamGame = new Map(points.rows.map((row) => [`${row.gameId}|${row.teamAbbreviation}`, row.pointsAllowed]));
  const defenseFacts = teamRows.map((row) => {
    const pointsAllowed = pointByTeamGame.get(`${row.game_id}|${normalizeTeam(row.team)}`);
    if (pointsAllowed == null) throw new Error(`Missing explicit pointsAllowed for ${row.game_id} ${row.team}`);
    return {
      kind: "TEAM_DEFENSE" as const,
      eventKey: eventByGameId.get(row.game_id)!.key,
      teamAbbreviation: normalizeTeam(row.team),
      finality: "FINAL" as const,
      sacks: n(row, "def_sacks"),
      defensiveInterceptions: n(row, "def_interceptions"),
      fumbleRecoveries: n(row, "fumble_recovery_opp"),
      defensiveTouchdowns: n(row, "def_tds"),
      specialTeamsTouchdowns: n(row, "special_teams_tds"),
      safeties: n(row, "def_safeties"),
      blockedKicks: n(row, "def_punt_blocks") + n(row, "def_pat_blocks") + n(row, "def_fg_blocks"),
      pointsAllowed,
    };
  });
  if (teamRows.length !== eventByGameId.size * 2) throw new Error(`Expected two team rows for every game; received ${teamRows.length} rows for ${eventByGameId.size} games`);
  if (pointByTeamGame.size !== defenseFacts.length) throw new Error(`Explicit pointsAllowed input must contain exactly ${defenseFacts.length} Week ${input.week} team facts`);

  const eventCounts = (rows: Array<{ eventKey: string }>) => Object.fromEntries([...rows.reduce((map, row) => map.set(row.eventKey, (map.get(row.eventKey) ?? 0) + 1), new Map<string, number>())].sort());
  const playerSummaryChecksum = checksum([input.playerCsv]);
  const snapChecksum = checksum([input.snapCsv]);
  const rosterChecksum = checksum([input.rosterCsv]);
  const playerChecksum = checksum([input.playerCsv, input.snapCsv, input.rosterCsv]);
  const teamChecksum = checksum([input.teamCsv]);
  const pointsChecksum = checksum([input.explicitPointsAllowedJson]);
  const defenseChecksum = checksum([input.teamCsv, input.explicitPointsAllowedJson]);
  const base = { contractVersion: SPORTS_STAT_IMPORT_VERSION, league: "NFL" as const, year: 2026 as const, sourceType: "LICENSED_OPEN_DATA", sourceTimestamp: input.sourceTimestamp };
  const playerPayload = {
    ...base,
    sourceLabel: "nflverse weekly player summary",
    sourceReference: input.playerSourceReference,
    sourceChecksum: playerChecksum,
    sourceComponents: [
      { label: "nflverse weekly player summary", reference: input.playerSourceReference, timestamp: input.sourceTimestamp, checksum: playerSummaryChecksum },
      { label: "nflverse snap-count participation manifest", reference: input.snapSourceReference, timestamp: input.sourceTimestamp, checksum: snapChecksum },
      { label: "nflverse weekly roster identity bridge", reference: input.rosterSourceReference, timestamp: input.sourceTimestamp, checksum: rosterChecksum },
    ],
    coverage: { week: input.week, kind: "PLAYER" as const, scope: "SNAP_VERIFIED_FANTASY_PARTICIPANTS" as const, finality: "FINAL" as const, sourceComplete: true as const, expectedEventCount: eventByGameId.size, expectedRowCount: playerFacts.length, eventRowCounts: eventCounts(playerFacts) },
    rows: playerFacts,
  };
  const defensePayload = {
    ...base,
    sourceLabel: `nflverse weekly team summary + ${points.sourceLabel}`,
    sourceReference: `${input.teamSourceReference} | ${points.sourceReference}`,
    sourceChecksum: defenseChecksum,
    sourceComponents: [
      { label: "nflverse weekly team summary", reference: input.teamSourceReference, timestamp: input.sourceTimestamp, checksum: teamChecksum },
      { label: points.sourceLabel, reference: points.sourceReference, timestamp: points.sourceTimestamp, checksum: pointsChecksum },
    ],
    coverage: { week: input.week, kind: "TEAM_DEFENSE" as const, scope: "EXPLICIT_TEAM_DEFENSES" as const, finality: "FINAL" as const, sourceComplete: true as const, expectedEventCount: eventByGameId.size, expectedRowCount: defenseFacts.length, eventRowCounts: eventCounts(defenseFacts) },
    rows: defenseFacts,
  };

  return {
    playerPayload: eventStatPayloadSchema.parse(playerPayload),
    defensePayload: eventStatPayloadSchema.parse(defensePayload),
    report: {
      week: input.week,
      games: eventByGameId.size,
      teams: new Set(teamRows.map((row) => normalizeTeam(row.team))).size,
      playerPerformances: playerFacts.length,
      playerZeroPerformances: playerFacts.filter((row) => row.participationStatus === "PARTICIPATED_ZERO").length,
      defensePerformances: defenseFacts.length,
      explicitPointsAllowed: defenseFacts.filter((row) => Number.isInteger(row.pointsAllowed)).length,
      playerSourceChecksum: playerChecksum,
      defenseSourceChecksum: defenseChecksum,
    },
  };
}
