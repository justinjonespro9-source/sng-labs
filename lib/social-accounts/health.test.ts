import { describe, expect, it } from "vitest";
import { deriveConnectionHealth } from "./health";

const now = new Date("2026-09-25T12:00:00.000Z");
describe("objective Social Account health", () => {
  it("does not treat known inventory as a healthy API connection", () => expect(deriveConnectionHealth({ accountLifecycle: "KNOWN", now })).toMatchObject({ state: "DISCONNECTED", code: "NOT_CONNECTED" }));
  it("requires operator action for an expired authorization", () => expect(deriveConnectionHealth({ accountLifecycle: "ACTIVE", authorizationStatus: "CONNECTED", expiresAt: now, now })).toMatchObject({ state: "REAUTHORIZATION_REQUIRED", operatorActionRequired: true }));
  it("surfaces missing permissions independently of performance", () => expect(deriveConnectionHealth({ accountLifecycle: "ACTIVE", authorizationStatus: "CONNECTED", now, missingRequiredScopes: ["tweet.write"] })).toMatchObject({ state: "PERMISSION_MISSING" }));
  it("marks a valid connection healthy", () => expect(deriveConnectionHealth({ accountLifecycle: "ACTIVE", authorizationStatus: "CONNECTED", now })).toMatchObject({ state: "HEALTHY", operatorActionRequired: false }));
});

