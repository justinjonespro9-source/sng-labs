import { fingerprint } from "./canonical-json";
import type { NflDefenseFacts, NflPlayerFacts } from "./types";

export const NFL_PLAYER_FACT_FIELDS = ["passingYards", "passingTouchdowns", "interceptionsThrown", "rushingYards", "rushingTouchdowns", "receptions", "receivingYards", "receivingTouchdowns", "twoPointConversions", "fumblesLost", "returnTouchdowns"] as const;
export const NFL_DEFENSE_FACT_FIELDS = ["sacks", "defensiveInterceptions", "fumbleRecoveries", "defensiveTouchdowns", "specialTeamsTouchdowns", "safeties", "blockedKicks", "pointsAllowed"] as const;

function complete<T extends readonly string[]>(source: Record<string, unknown>, fields: T): Record<T[number], number> {
  const result: Record<string, number> = {};
  for (const field of fields) {
    const value = source[field];
    if (!Number.isInteger(value)) throw new Error(`Incomplete factual input: ${field}`);
    result[field] = value as number;
  }
  return result as Record<T[number], number>;
}

export function adaptNflPlayerFacts(source: Record<string, unknown>): NflPlayerFacts {
  const participationStatus = source.participationStatus;
  if (typeof participationStatus !== "string") throw new Error("Incomplete factual input: participationStatus");
  return { participationStatus: participationStatus as NflPlayerFacts["participationStatus"], ...complete(source, NFL_PLAYER_FACT_FIELDS) };
}

export function adaptNflDefenseFacts(source: Record<string, unknown>): NflDefenseFacts {
  return complete(source, NFL_DEFENSE_FACT_FIELDS) as NflDefenseFacts;
}

export function factualRevisionFingerprint(source: Record<string, unknown>): string {
  return fingerprint(source);
}
