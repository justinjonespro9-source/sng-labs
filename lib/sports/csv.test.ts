import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("CSV parser", () => {
  it("preserves commas, quotes, and Unicode in source fields", () => {
    expect(parseCsv('id,name,note\n1,"Estimé, Audric","said ""hello"""\n')).toEqual([
      { id: "1", name: "Estimé, Audric", note: 'said "hello"' },
    ]);
  });
});
