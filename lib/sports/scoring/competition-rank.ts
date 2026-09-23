import { fingerprint } from "./canonical-json";
import type { RankingEntry, RankingInput } from "./types";

export function competitionRank(input: RankingInput[]): RankingEntry[] {
  const sorted = [...input].sort((a, b) => b.pointsHundredths - a.pointsHundredths || a.participantId.localeCompare(b.participantId));
  const sizes = new Map<number, number>();
  for (const item of sorted) sizes.set(item.pointsHundredths, (sizes.get(item.pointsHundredths) ?? 0) + 1);
  let previous: number | undefined;
  let rank = 0;
  return sorted.map((item, index) => {
    if (previous !== item.pointsHundredths) rank = index + 1;
    previous = item.pointsHundredths;
    return {
      ...item, fantasyPoints: (item.pointsHundredths / 100).toFixed(2), competitionRank: rank,
      tieGroupKey: fingerprint({ pointsHundredths: item.pointsHundredths }),
      tieGroupSize: sizes.get(item.pointsHundredths)!, displayOrdinal: index + 1, fieldSize: sorted.length,
      isTop3: rank <= 3, isTop10: rank <= 10, isTop15: rank <= 15,
    };
  });
}
