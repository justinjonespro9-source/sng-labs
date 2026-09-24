import { describe, expect, it } from "vitest";
import { createOAuthTransaction, hashOAuthState, MemoryOAuthTransactionStore } from "./oauth";

describe("OAuth state and PKCE contracts", () => {
  it("uses hashed state storage and S256 PKCE material", async () => {
    const created = createOAuthTransaction({ platformApplicationId: "app", actorId: "owner", redirectUri: "https://preview.example/callback", now: new Date("2026-09-25T00:00:00Z") });
    expect(created.transaction.stateHash).toBe(hashOAuthState(created.state));
    expect(created.transaction.stateHash).not.toContain(created.state);
    expect(created.codeChallenge).not.toBe(created.transaction.codeVerifier);
  });
  it("consumes a callback state exactly once and rejects replay", async () => {
    const store = new MemoryOAuthTransactionStore();
    const created = createOAuthTransaction({ platformApplicationId: "app", actorId: "owner", redirectUri: "https://preview.example/callback", now: new Date("2026-09-25T00:00:00Z") });
    await store.save(created.transaction);
    expect(await store.consume(created.transaction.stateHash, new Date("2026-09-25T00:01:00Z"))).toEqual(created.transaction);
    expect(await store.consume(created.transaction.stateHash, new Date("2026-09-25T00:02:00Z"))).toBeNull();
  });
  it("rejects expired callback state", async () => {
    const store = new MemoryOAuthTransactionStore();
    const created = createOAuthTransaction({ platformApplicationId: "app", actorId: "owner", redirectUri: "https://preview.example/callback", now: new Date("2026-09-25T00:00:00Z"), ttlMs: 1000 });
    await store.save(created.transaction);
    expect(await store.consume(created.transaction.stateHash, new Date("2026-09-25T00:00:02Z"))).toBeNull();
  });
});

