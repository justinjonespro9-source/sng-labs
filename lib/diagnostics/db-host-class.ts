/**
 * Temporary G1 Preview diagnostic helpers.
 * Delete this module (and the route that imports it) before merging PR #31.
 */

import { timingSafeEqual } from "crypto";

export type DbHostClass = "PREVIEW" | "PRODUCTION" | "OTHER";

/** Exact Neon compute endpoint id for SNG-LABS-Preview (from operator-verified Preview project). */
export const PREVIEW_NEON_ENDPOINT_ID = "ep-cold-sun-b580ukxa";

/** Exact Neon compute endpoint id for SNG LABS Production. */
export const PRODUCTION_NEON_ENDPOINT_ID = "ep-snowy-star-awqzs6ol";

function neonEndpointIdFromHostname(hostname: string): string | null {
  const lower = hostname.toLowerCase();
  if (!lower.endsWith(".aws.neon.tech")) return null;
  const beforeAws = lower.slice(0, -".aws.neon.tech".length);
  const firstLabel = beforeAws.split(".")[0];
  if (!firstLabel?.startsWith("ep-")) return null;
  return firstLabel.endsWith("-pooler") ? firstLabel.slice(0, -"-pooler".length) : firstLabel;
}

/** Classify a Postgres connection string by exact Neon endpoint id. Never opens a connection. */
export function classifyDatabaseUrlHost(databaseUrl: string | undefined | null): DbHostClass {
  if (!databaseUrl?.trim()) return "OTHER";
  let hostname: string;
  try {
    hostname = new URL(databaseUrl.trim()).hostname.toLowerCase();
  } catch {
    return "OTHER";
  }
  if (!hostname) return "OTHER";
  const endpointId = neonEndpointIdFromHostname(hostname);
  if (!endpointId) return "OTHER";
  if (endpointId === PREVIEW_NEON_ENDPOINT_ID) return "PREVIEW";
  if (endpointId === PRODUCTION_NEON_ENDPOINT_ID) return "PRODUCTION";
  return "OTHER";
}

export function isPreviewVercelRuntime(vercelEnv: string | undefined | null): boolean {
  return vercelEnv === "preview";
}

/** Constant-time bearer comparison. Returns false if either side is missing/empty. */
export function bearerTokenMatches(expectedToken: string | undefined | null, authorizationHeader: string | null): boolean {
  const expected = expectedToken?.trim() ?? "";
  if (!expected || expected.length < 16) return false;
  if (!authorizationHeader?.startsWith("Bearer ")) return false;
  const provided = authorizationHeader.slice("Bearer ".length).trim();
  if (!provided || provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

/**
 * Access gate for the temporary diagnostic.
 * Production (and non-preview) always denied without consulting DATABASE_URL.
 */
export function resolveDbHostClassDiagnostic(input: {
  vercelEnv: string | undefined | null;
  diagnosticToken: string | undefined | null;
  authorizationHeader: string | null;
  databaseUrl: string | undefined | null;
}): { ok: true; classification: DbHostClass } | { ok: false; status: 404 | 405 } {
  if (!isPreviewVercelRuntime(input.vercelEnv)) return { ok: false, status: 404 };
  if (!bearerTokenMatches(input.diagnosticToken, input.authorizationHeader)) return { ok: false, status: 404 };
  return { ok: true, classification: classifyDatabaseUrlHost(input.databaseUrl) };
}
