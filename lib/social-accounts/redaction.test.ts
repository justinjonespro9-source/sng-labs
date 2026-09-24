import { describe, expect, it } from "vitest";
import { assertNoSecretMaterial, redactSocialSecrets } from "./redaction";

describe("Social Accounts secret redaction", () => {
  it("redacts credential fields, bearer values, webhook URLs and nested values", () => {
    const redacted = redactSocialSecrets({ accessToken: "abc", nested: { note: "Bearer top.secret", webhook: "https://discord.com/api/webhooks/1/token" } });
    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain("abc");
    expect(serialized).not.toContain("top.secret");
    expect(serialized).not.toContain("/api/webhooks/1/token");
    expect(() => assertNoSecretMaterial(redacted)).not.toThrow();
  });
  it("rejects unredacted bearer material", () => expect(() => assertNoSecretMaterial({ note: "Bearer live-token" })).toThrow(/Secret material/));
});

