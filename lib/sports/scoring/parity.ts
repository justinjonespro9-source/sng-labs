export type ParityValue = { key: string; pointsHundredths: number; rank?: number };
export type ParityDifference = { key: string; kind: "MISSING_EXPECTED" | "MISSING_ACTUAL" | "POINTS" | "RANK"; expected?: number; actual?: number };

export function compareParity(expected: ParityValue[], actual: ParityValue[]): ParityDifference[] {
  const left = new Map(expected.map((value) => [value.key, value]));
  const right = new Map(actual.map((value) => [value.key, value]));
  const differences: ParityDifference[] = [];
  for (const key of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const a = left.get(key); const b = right.get(key);
    if (!a) differences.push({ key, kind: "MISSING_EXPECTED", actual: b?.pointsHundredths });
    else if (!b) differences.push({ key, kind: "MISSING_ACTUAL", expected: a.pointsHundredths });
    else {
      if (a.pointsHundredths !== b.pointsHundredths) differences.push({ key, kind: "POINTS", expected: a.pointsHundredths, actual: b.pointsHundredths });
      if (a.rank !== undefined && b.rank !== undefined && a.rank !== b.rank) differences.push({ key, kind: "RANK", expected: a.rank, actual: b.rank });
    }
  }
  return differences;
}
