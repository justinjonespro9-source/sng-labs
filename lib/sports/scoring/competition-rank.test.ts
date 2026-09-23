import { describe, expect, it } from "vitest";
import { competitionRank } from "./competition-rank";

const inputs = (scores: number[]) => scores.map((pointsHundredths, index) => ({ participantId: `p${String(index).padStart(2, "0")}`, derivedPerformanceId: `d${index}`, pointsHundredths }));

describe("competition ranking", () => {
  it("creates the competition sequence 1,2,2,4", () => expect(competitionRank(inputs([1000, 900, 900, 800])).map((x) => x.competitionRank)).toEqual([1, 2, 2, 4]));
  it("uses exact hundredths rather than display rounding", () => expect(competitionRank(inputs([1001, 1000])).map((x) => x.competitionRank)).toEqual([1, 2]));
  it("retains every tie across Top 3", () => { const ranked = competitionRank(inputs([500, 400, 300, 300, 300, 200])); expect(ranked.filter((x) => x.isTop3)).toHaveLength(5); });
  it("retains every tie across Top 10", () => { const ranked = competitionRank(inputs([2000,1900,1800,1700,1600,1500,1400,1300,1200,1100,1100,1100,1000])); expect(ranked.filter((x) => x.isTop10)).toHaveLength(12); });
  it("retains every tie across Top 15", () => { const ranked = competitionRank(inputs([...Array.from({length:14},(_,i)=>3000-i*100),1600,1600,1600,1500])); expect(ranked.filter((x) => x.isTop15)).toHaveLength(17); });
  it("provides complete deterministic field ordering", () => expect(competitionRank(inputs([100, 300, 200])).map((x) => x.pointsHundredths)).toEqual([300, 200, 100]));
  it("records tie group sizes", () => expect(competitionRank(inputs([100, 100, 0])).map((x) => x.tieGroupSize)).toEqual([2, 2, 1]));
});
