import type { SocialConnectionHealthSignal, SocialConnectionHealthState } from "@prisma/client";

export type HealthInput = {
  accountLifecycle: "KNOWN" | "ACTIVE" | "INACTIVE" | "DISABLED";
  authorizationStatus?: "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "EXPIRED" | "REAUTHORIZATION_REQUIRED" | "REVOKED" | "ERROR" | "DISABLED";
  expiresAt?: Date | null;
  now: Date;
  missingRequiredScopes?: string[];
  latestFailure?: "REFRESH_FAILED" | "ACCOUNT_INACCESSIBLE" | "API_REQUEST_FAILED" | "WEBHOOK_FAILED" | null;
};

export type DerivedConnectionHealth = {
  state: SocialConnectionHealthState;
  signal: SocialConnectionHealthSignal;
  code: string;
  operatorActionRequired: boolean;
};

export function deriveConnectionHealth(input: HealthInput): DerivedConnectionHealth {
  if (input.accountLifecycle === "DISABLED" || input.authorizationStatus === "DISABLED") return { state: "DISABLED", signal: "ACCOUNT_DISABLED", code: "ACCOUNT_DISABLED", operatorActionRequired: false };
  if (!input.authorizationStatus || input.authorizationStatus === "NOT_CONNECTED" || input.authorizationStatus === "REVOKED") return { state: "DISCONNECTED", signal: "ACCOUNT_INACCESSIBLE", code: "NOT_CONNECTED", operatorActionRequired: input.accountLifecycle === "ACTIVE" };
  if (input.authorizationStatus === "REAUTHORIZATION_REQUIRED") return { state: "REAUTHORIZATION_REQUIRED", signal: "AUTHORIZATION_EXPIRED", code: "REAUTHORIZATION_REQUIRED", operatorActionRequired: true };
  if (input.authorizationStatus === "EXPIRED" || (input.expiresAt && input.expiresAt <= input.now)) return { state: "REAUTHORIZATION_REQUIRED", signal: "AUTHORIZATION_EXPIRED", code: "AUTHORIZATION_EXPIRED", operatorActionRequired: true };
  if (input.missingRequiredScopes?.length) return { state: "PERMISSION_MISSING", signal: "PERMISSION_LOST", code: "REQUIRED_SCOPE_MISSING", operatorActionRequired: true };
  if (input.latestFailure === "REFRESH_FAILED") return { state: "AT_RISK", signal: "REFRESH_FAILED", code: "TOKEN_REFRESH_FAILED", operatorActionRequired: true };
  if (input.latestFailure) return { state: "API_ERROR", signal: input.latestFailure, code: input.latestFailure, operatorActionRequired: true };
  if (input.authorizationStatus === "CONNECTED") return { state: "HEALTHY", signal: "AUTHORIZATION_VALID", code: "AUTHORIZATION_VALID", operatorActionRequired: false };
  return { state: "UNKNOWN", signal: "MANUAL_REVIEW", code: "HEALTH_UNKNOWN", operatorActionRequired: true };
}

