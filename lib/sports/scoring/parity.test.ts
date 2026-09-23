import { describe, expect, it } from "vitest";
import { compareParity } from "./parity";

describe("parity reports", () => {
  it("accepts exact parity", () => expect(compareParity([{ key: "a", pointsHundredths: 100, rank: 1 }], [{ key: "a", pointsHundredths: 100, rank: 1 }])).toEqual([]));
  it("reports point differences", () => expect(compareParity([{ key: "a", pointsHundredths: 100 }], [{ key: "a", pointsHundredths: 99 }])[0].kind).toBe("POINTS"));
  it("reports rank differences", () => expect(compareParity([{ key: "a", pointsHundredths: 100, rank: 1 }], [{ key: "a", pointsHundredths: 100, rank: 2 }])[0].kind).toBe("RANK"));
  it("reports both missing directions", () => expect(compareParity([{ key: "a", pointsHundredths: 1 }], [{ key: "b", pointsHundredths: 1 }]).map((x) => x.kind).sort()).toEqual(["MISSING_ACTUAL", "MISSING_EXPECTED"]));
});
