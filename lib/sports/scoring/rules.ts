import { fingerprint } from "./canonical-json";

export const NFL_HALF_PPR_SNG_V1 = {
  code: "SNG_NFL_HALF_PPR",
  version: 1,
  displayName: "NFL Half-PPR — SNG V1",
  sport: "FOOTBALL",
  league: "NFL",
  precision: { representation: "INTEGER_HUNDREDTHS", decimalScale: 2 },
  participation: {
    scorable: ["PARTICIPATED_WITH_STATS", "PARTICIPATED_ZERO"],
    blocked: ["DID_NOT_PARTICIPATE", "UNKNOWN"],
  },
  player: {
    passingYards: 4, passingTouchdowns: 400, interceptionsThrown: -200,
    rushingYards: 10, rushingTouchdowns: 600, receptions: 50,
    receivingYards: 10, receivingTouchdowns: 600, twoPointConversions: 200,
    fumblesLost: -200, returnTouchdowns: 600,
    bonuses: [
      { key: "passing300", field: "passingYards", minimum: 300, pointsHundredths: 500 },
      { key: "rushing100", field: "rushingYards", minimum: 100, pointsHundredths: 500 },
      { key: "receiving100", field: "receivingYards", minimum: 100, pointsHundredths: 500 },
    ],
  },
  defense: {
    sacks: 100, defensiveInterceptions: 200, fumbleRecoveries: 200,
    defensiveTouchdowns: 600, specialTeamsTouchdowns: 600, safeties: 200, blockedKicks: 200,
    pointsAllowed: [
      { maximum: 0, pointsHundredths: 1000 }, { maximum: 6, pointsHundredths: 700 },
      { maximum: 13, pointsHundredths: 400 }, { maximum: 20, pointsHundredths: 100 },
      { maximum: 27, pointsHundredths: 0 }, { maximum: 34, pointsHundredths: -100 },
      { maximum: null, pointsHundredths: -400 },
    ],
  },
  ranking: { method: "COMPETITION", equality: "EXACT_HUNDREDTHS", cutoffMembership: "RANK_LTE" },
} as const;

export const NFL_SCORING_ENGINE_VERSION = "sng-nfl-fantasy-engine/1.0.0";
export const NFL_POSITION_ELIGIBILITY_VERSION = "sng-nfl-weekly-position-eligibility/1.0.0";
export const NFL_HALF_PPR_SNG_V1_CHECKSUM = fingerprint(NFL_HALF_PPR_SNG_V1);

export function getScoringRuleset(code: string, version: number) {
  if (code !== NFL_HALF_PPR_SNG_V1.code || version !== NFL_HALF_PPR_SNG_V1.version) {
    throw new Error(`Unknown scoring ruleset: ${code}@${version}`);
  }
  return NFL_HALF_PPR_SNG_V1;
}
