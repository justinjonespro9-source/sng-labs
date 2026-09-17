import { describe, expect, it } from "vitest";
import { getGoogleAuthConfig } from "./google-config";

describe("Google auth configuration", () => {
  it("returns trimmed explicit credentials", () => {
    expect(getGoogleAuthConfig({ AUTH_GOOGLE_ID: " client-id ", AUTH_GOOGLE_SECRET: " client-secret " })).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      configured: true,
    });
  });

  it("fails closed when either credential is absent", () => {
    expect(getGoogleAuthConfig({ AUTH_GOOGLE_ID: "client-id" }).configured).toBe(false);
    expect(getGoogleAuthConfig({ AUTH_GOOGLE_SECRET: "client-secret" }).configured).toBe(false);
  });
});
