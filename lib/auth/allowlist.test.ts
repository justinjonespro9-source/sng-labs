import { describe, expect, it } from "vitest";
import { isAllowedEmail, normalizeEmail, parseAllowedEmails, roleForAllowedEmail } from "./allowlist";

describe("command-center email allowlist", () => {
  it("normalizes case and whitespace", () => {
    expect(normalizeEmail("  Justin@Example.COM ")).toBe("justin@example.com");
  });

  it("parses comma-separated addresses and removes duplicates", () => {
    expect([...parseAllowedEmails("a@example.com, B@example.com, a@example.com")]).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
  });

  it("fails closed when the allowlist is empty", () => {
    expect(isAllowedEmail("justin@example.com", "")).toBe(false);
  });

  it("allows only configured addresses", () => {
    expect(isAllowedEmail("JUSTIN@example.com", "justin@example.com,editor@example.com")).toBe(true);
    expect(isAllowedEmail("stranger@example.com", "justin@example.com")).toBe(false);
  });

  it("assigns the first configured address as owner", () => {
    const raw = "justin@example.com,editor@example.com";
    expect(roleForAllowedEmail("justin@example.com", raw)).toBe("OWNER");
    expect(roleForAllowedEmail("editor@example.com", raw)).toBe("EDITOR");
  });
});
