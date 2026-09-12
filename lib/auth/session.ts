import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAllowedEmail } from "@/lib/auth/allowlist";

export async function requireCommandCenterUser() {
  const session = await auth();
  if (!session?.user || !isAllowedEmail(session.user.email)) redirect("/sign-in");

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role: session.user.role,
  };
}
