import { createHash, randomBytes } from "node:crypto";

export type OAuthTransaction = {
  id: string;
  stateHash: string;
  codeVerifier: string;
  platformApplicationId: string;
  actorId: string;
  redirectUri: string;
  expiresAt: Date;
};

export interface OAuthTransactionStore {
  save(transaction: OAuthTransaction): Promise<void>;
  consume(stateHash: string, now: Date): Promise<OAuthTransaction | null>;
}

function base64Url(value: Buffer) { return value.toString("base64url"); }
export function hashOAuthState(state: string) { return createHash("sha256").update(state).digest("hex"); }

export function createOAuthTransaction(input: { platformApplicationId: string; actorId: string; redirectUri: string; now?: Date; ttlMs?: number }) {
  const now = input.now ?? new Date();
  const state = base64Url(randomBytes(32));
  const codeVerifier = base64Url(randomBytes(48));
  const codeChallenge = base64Url(createHash("sha256").update(codeVerifier).digest());
  return {
    state,
    codeChallenge,
    transaction: {
      id: base64Url(randomBytes(18)),
      stateHash: hashOAuthState(state),
      codeVerifier,
      platformApplicationId: input.platformApplicationId,
      actorId: input.actorId,
      redirectUri: input.redirectUri,
      expiresAt: new Date(now.getTime() + (input.ttlMs ?? 10 * 60_000)),
    },
  };
}

export class MemoryOAuthTransactionStore implements OAuthTransactionStore {
  private readonly transactions = new Map<string, OAuthTransaction>();
  async save(transaction: OAuthTransaction) { this.transactions.set(transaction.stateHash, transaction); }
  async consume(stateHash: string, now: Date) {
    const transaction = this.transactions.get(stateHash) ?? null;
    if (!transaction) return null;
    this.transactions.delete(stateHash);
    return transaction.expiresAt > now ? transaction : null;
  }
}

