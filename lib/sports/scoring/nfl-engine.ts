import { NFL_HALF_PPR_SNG_V1 } from "./rules";
import type { NflDefenseFacts, NflPlayerFacts, ScoringComponent, ScoringResult } from "./types";

function integer(value: unknown, key: string): number {
  if (!Number.isInteger(value)) throw new Error(`Incomplete scoring input: ${key} must be an integer`);
  return value as number;
}

function result(components: ScoringComponent[]): ScoringResult {
  const pointsHundredths = components.reduce((sum, component) => sum + component.pointsHundredths, 0);
  return { pointsHundredths, fantasyPoints: (pointsHundredths / 100).toFixed(2), components };
}

export function scoreNflPlayer(facts: NflPlayerFacts): ScoringResult {
  if (!NFL_HALF_PPR_SNG_V1.participation.scorable.includes(facts.participationStatus as never)) {
    throw new Error(`Unscorable participation status: ${facts.participationStatus}`);
  }
  const coefficients = NFL_HALF_PPR_SNG_V1.player;
  const fields = ["passingYards", "passingTouchdowns", "interceptionsThrown", "rushingYards", "rushingTouchdowns", "receptions", "receivingYards", "receivingTouchdowns", "twoPointConversions", "fumblesLost", "returnTouchdowns"] as const;
  const components: ScoringComponent[] = fields.map((key) => {
    const quantity = integer(facts[key], key);
    return { key, quantity, pointsHundredths: quantity * coefficients[key] };
  });
  for (const bonus of coefficients.bonuses) {
    const quantity = integer(facts[bonus.field], bonus.field);
    if (quantity >= bonus.minimum) components.push({ key: bonus.key, quantity: 1, pointsHundredths: bonus.pointsHundredths });
  }
  return result(components);
}

export function scoreNflDefense(facts: NflDefenseFacts): ScoringResult {
  const rules = NFL_HALF_PPR_SNG_V1.defense;
  const fields = ["sacks", "defensiveInterceptions", "fumbleRecoveries", "defensiveTouchdowns", "specialTeamsTouchdowns", "safeties", "blockedKicks"] as const;
  const components: ScoringComponent[] = fields.map((key) => {
    const quantity = integer(facts[key], key);
    return { key, quantity, pointsHundredths: quantity * rules[key] };
  });
  const pointsAllowed = integer(facts.pointsAllowed, "pointsAllowed");
  if (pointsAllowed < 0) throw new Error("Invalid scoring input: pointsAllowed cannot be negative");
  const tier = rules.pointsAllowed.find((candidate) => candidate.maximum === null || pointsAllowed <= candidate.maximum)!;
  components.push({ key: "pointsAllowed", quantity: pointsAllowed, pointsHundredths: tier.pointsHundredths });
  return result(components);
}
