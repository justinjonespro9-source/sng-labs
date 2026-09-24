import { parseSocialPlatform, requireEnabledSocialConnector, requireSocialIntegrationAdmin } from "@/lib/social-accounts/integration-routes";

export async function GET(_request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const admin = await requireSocialIntegrationAdmin();
  if (!admin.ok) return admin.response;
  const platform = parseSocialPlatform((await params).platform.toUpperCase());
  if (!platform) return Response.json({ error: "Unknown social platform" }, { status: 404 });
  const connector = await requireEnabledSocialConnector(platform);
  if (!connector.ok) return connector.response;
  return Response.json({ error: "Authorization execution is not implemented in the foundation phase" }, { status: 501 });
}

