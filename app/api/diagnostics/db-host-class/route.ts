/**
 * Temporary G1 Preview diagnostic. Remove before merging PR #31.
 * Classifies runtime DATABASE_URL by Neon endpoint id only — no DB connection.
 */

import { resolveDbHostClassDiagnostic } from "@/lib/diagnostics/db-host-class";

export const dynamic = "force-dynamic";

function notFound() {
  return new Response(null, { status: 404 });
}

export async function GET(request: Request) {
  const result = resolveDbHostClassDiagnostic({
    vercelEnv: process.env.VERCEL_ENV,
    diagnosticToken: process.env.DB_HOST_CLASS_DIAGNOSTIC_TOKEN,
    authorizationHeader: request.headers.get("authorization"),
    databaseUrl: process.env.DATABASE_URL,
  });
  if (!result.ok) return notFound();
  return new Response(result.classification, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
