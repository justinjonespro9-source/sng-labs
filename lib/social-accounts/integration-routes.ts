import "server-only";
import type { SocialPlatform } from "@prisma/client";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth/allowlist";
import { getCredentialVault } from "./credential-vault";
import { getSocialProviderAdapter } from "./providers/registry";

export async function requireSocialIntegrationAdmin() {
  const session = await auth();
  if (!session?.user || !isAllowedEmail(session.user.email)) return { ok: false as const, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!new Set(["OWNER", "ADMIN"]).has(session.user.role)) return { ok: false as const, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true as const, user: session.user };
}

export async function requireEnabledSocialConnector(platform: SocialPlatform) {
  if (process.env.SOCIAL_OAUTH_ROUTES_ENABLED !== "true") return { ok: false as const, response: Response.json({ error: "Social OAuth routes are disabled" }, { status: 503 }) };
  const adapter = getSocialProviderAdapter(platform);
  if (!adapter || !adapter.liveAuthorizationEnabled) return { ok: false as const, response: Response.json({ error: "Platform connector is not enabled" }, { status: 503 }) };
  if (!(await getCredentialVault().isAvailable())) return { ok: false as const, response: Response.json({ error: "Credential vault is unavailable" }, { status: 503 }) };
  return { ok: true as const, adapter };
}

export function parseSocialPlatform(value: string): SocialPlatform | null {
  return new Set(["X", "INSTAGRAM", "FACEBOOK", "DISCORD", "LINKEDIN", "TIKTOK", "YOUTUBE", "THREADS", "OTHER"]).has(value) ? value as SocialPlatform : null;
}

