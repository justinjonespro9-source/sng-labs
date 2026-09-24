import { requireSocialIntegrationAdmin } from "@/lib/social-accounts/integration-routes";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSocialIntegrationAdmin();
  if (!admin.ok) return admin.response;
  await params;
  return Response.json({ error: "Capability verification is disabled until a credential vault and provider application are approved" }, { status: 503 });
}

