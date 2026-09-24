import { describe, expect, it } from "vitest";
import { SocialConnectorDisabledError } from "./provider-adapter";
import { listSocialProviderAdapters } from "./providers/registry";

describe("provider adapter contracts", () => {
  it("provides disabled contracts for the approved initial platforms", () => {
    const adapters = listSocialProviderAdapters();
    expect(adapters.map((item) => item.platform).sort()).toEqual(["DISCORD", "FACEBOOK", "INSTAGRAM", "TIKTOK", "X"]);
    expect(adapters.every((item) => !item.liveAuthorizationEnabled)).toBe(true);
  });
  it("preserves Meta one-authorization-to-many-identity architecture", () => {
    const adapters = listSocialProviderAdapters();
    expect(adapters.find((item) => item.platform === "FACEBOOK")?.supportsMultipleAccountsPerAuthorization).toBe(true);
    expect(adapters.find((item) => item.platform === "INSTAGRAM")?.supportedAccountTypes).toContain("PROFESSIONAL_ACCOUNT");
  });
  it("keeps Discord guild, channel and webhook destinations distinct", () => {
    expect(listSocialProviderAdapters().find((item) => item.platform === "DISCORD")?.supportedAccountTypes).toEqual(["GUILD", "CHANNEL", "WEBHOOK_DESTINATION"]);
  });
  it("fails closed instead of constructing a live authorization URL", async () => {
    const adapter = listSocialProviderAdapters().find((item) => item.platform === "X")!;
    await expect(adapter.buildAuthorizationUrl({ state: "state", codeChallenge: "challenge", redirectUri: "https://example.test" })).rejects.toBeInstanceOf(SocialConnectorDisabledError);
  });
});

