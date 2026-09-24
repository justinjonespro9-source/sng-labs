import type { PrismaClient } from "@prisma/client";
import { evaluateAndPersistNflWeek } from "../game-day/recommendations";

export type SportsEvaluationWindow = { leagueCode: string; seasonYear: number; week?: number; startsAt?: Date; endsAt?: Date };

type LeagueEvaluator = (prisma: PrismaClient, input: SportsEvaluationWindow) => Promise<{ events: number; candidates: number; created: number; refreshed: number; ruleVersion: string }>;

const evaluators: Record<string, LeagueEvaluator> = {
  NFL: (prisma, input) => {
    if (!input.week) throw new Error("NFL evaluation requires a week");
    return evaluateAndPersistNflWeek(prisma, { season: input.seasonYear, week: input.week });
  },
};

export function registeredSportsIntelligenceLeagues() {
  return Object.keys(evaluators);
}

export async function evaluateSportsWindow(prisma: PrismaClient, input: SportsEvaluationWindow) {
  const evaluator = evaluators[input.leagueCode.toUpperCase()];
  if (!evaluator) throw new Error(`No approved Sports Intelligence evaluator is registered for ${input.leagueCode}`);
  return evaluator(prisma, { ...input, leagueCode: input.leagueCode.toUpperCase() });
}
