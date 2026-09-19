import { describe, expect, it } from "vitest";
import { checksumImport, rosterPayloadSchema } from "./import-schema";

describe("sports roster import contract", () => {
  it("accepts NFL 2026 and rejects unsupported years", () => {
    const base = { league: "NFL", year: 2026, sourceLabel: "operator", rows: [{ provider: "manual", externalId: "p1", canonicalName: "Player One", teamAbbreviation: "MIN", fantasyPosition: "RB" }] };
    expect(rosterPayloadSchema.safeParse(base).success).toBe(true);
    expect(rosterPayloadSchema.safeParse({ ...base, year: 2025 }).success).toBe(false);
  });

  it("produces stable checksums for identical replay", () => {
    const raw = JSON.stringify({ hello: "world" });
    expect(checksumImport(raw)).toBe(checksumImport(raw));
    expect(checksumImport(raw)).not.toBe(checksumImport(`${raw} `));
  });
});
