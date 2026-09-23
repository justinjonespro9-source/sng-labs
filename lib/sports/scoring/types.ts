export type NflPlayerFacts = {
  participationStatus: "PARTICIPATED_WITH_STATS" | "PARTICIPATED_ZERO" | "DID_NOT_PARTICIPATE" | "UNKNOWN";
  passingYards: number; passingTouchdowns: number; interceptionsThrown: number;
  rushingYards: number; rushingTouchdowns: number; receptions: number;
  receivingYards: number; receivingTouchdowns: number; twoPointConversions: number;
  fumblesLost: number; returnTouchdowns: number;
};

export type NflDefenseFacts = {
  sacks: number; defensiveInterceptions: number; fumbleRecoveries: number;
  defensiveTouchdowns: number; specialTeamsTouchdowns: number; safeties: number;
  blockedKicks: number; pointsAllowed: number;
};

export type ScoringComponent = { key: string; quantity: number; pointsHundredths: number };
export type ScoringResult = { pointsHundredths: number; fantasyPoints: string; components: ScoringComponent[] };

export type RankingInput = { participantId: string; derivedPerformanceId: string; pointsHundredths: number };
export type RankingEntry = RankingInput & {
  fantasyPoints: string; competitionRank: number; tieGroupKey: string; tieGroupSize: number;
  displayOrdinal: number; fieldSize: number; isTop3: boolean; isTop10: boolean; isTop15: boolean;
};
