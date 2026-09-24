import { describe, expect, it } from "vitest";
import { decideSocialCapability } from "./capability-gate";
import type { CapabilityGateInput } from "./types";

const now = new Date("2026-09-25T12:00:00.000Z");
function validInput(): CapabilityGateInput {
  return {
    requestedBrandId: "brand-a", capability: "PUBLISH_TEXT", now, vaultAvailable: true,
    account: { id: "account-a", brandId: "brand-a", platform: "X", lifecycleStatus: "ACTIVE", publishingEnabled: true },
    authorizationAccount: { id: "link-a", status: "VERIFIED", authorization: { id: "auth-a", status: "CONNECTED", grantedScopes: ["tweet.write", "users.read"], accessCredentialRef: "vault://social/x/a", expiresAt: new Date("2026-10-01T00:00:00.000Z") } },
    requiredScopes: ["tweet.write", "users.read"],
    snapshot: { id: "snapshot-a", validUntil: new Date("2026-09-25T13:00:00.000Z"), result: { state: "SUPPORTED" } },
  };
}

describe("Social capability gate", () => {
  it("allows only a fully verified current capability", () => expect(decideSocialCapability(validInput())).toEqual({ allowed: true, socialAccountId: "account-a", authorizationAccountId: "link-a", capabilitySnapshotId: "snapshot-a" }));
  it.each([
    ["unknown account", (i: CapabilityGateInput) => { i.account = null; }, "ACCOUNT_UNKNOWN"],
    ["brand mismatch", (i: CapabilityGateInput) => { i.requestedBrandId = "brand-b"; }, "BRAND_MISMATCH"],
    ["disabled account", (i: CapabilityGateInput) => { i.account!.lifecycleStatus = "DISABLED"; }, "ACCOUNT_DISABLED"],
    ["publishing disabled", (i: CapabilityGateInput) => { i.account!.publishingEnabled = false; }, "PUBLISHING_DISABLED"],
    ["unverified account link", (i: CapabilityGateInput) => { i.authorizationAccount!.status = "DISCOVERED"; }, "AUTHORIZATION_ACCOUNT_UNVERIFIED"],
    ["invalid authorization", (i: CapabilityGateInput) => { i.authorizationAccount!.authorization.status = "ERROR"; }, "AUTHORIZATION_INVALID"],
    ["expired authorization status", (i: CapabilityGateInput) => { i.authorizationAccount!.authorization.status = "EXPIRED"; }, "AUTHORIZATION_EXPIRED"],
    ["expired authorization time", (i: CapabilityGateInput) => { i.authorizationAccount!.authorization.expiresAt = new Date("2026-09-25T11:59:59.000Z"); }, "AUTHORIZATION_EXPIRED"],
    ["reauthorization", (i: CapabilityGateInput) => { i.authorizationAccount!.authorization.status = "REAUTHORIZATION_REQUIRED"; }, "REAUTHORIZATION_REQUIRED"],
    ["vault unavailable", (i: CapabilityGateInput) => { i.vaultAvailable = false; }, "VAULT_UNAVAILABLE"],
    ["missing credential reference", (i: CapabilityGateInput) => { i.authorizationAccount!.authorization.accessCredentialRef = null; }, "CREDENTIAL_REFERENCE_MISSING"],
    ["missing scope", (i: CapabilityGateInput) => { i.authorizationAccount!.authorization.grantedScopes = ["users.read"]; }, "SCOPE_MISSING"],
    ["unverified capability", (i: CapabilityGateInput) => { i.snapshot = null; }, "CAPABILITY_UNVERIFIED"],
    ["stale capability", (i: CapabilityGateInput) => { i.snapshot!.validUntil = now; }, "CAPABILITY_STALE"],
    ["blocked capability", (i: CapabilityGateInput) => { i.snapshot!.result = { state: "BLOCKED" }; }, "CAPABILITY_BLOCKED"],
  ])("fails closed for %s", (_name, mutate, reasonCode) => {
    const input = validInput(); mutate(input);
    expect(decideSocialCapability(input)).toMatchObject({ allowed: false, reasonCode });
  });
});

