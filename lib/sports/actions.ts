"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { applyRosterImport, previewRosterImport } from "./ingestion";
import { applyEventStatImport, previewEventStatImport } from "./stat-ingestion";

async function requireSportsOperator() {
  const user = await requireCommandCenterUser();
  if (!(["OWNER", "ADMIN", "EDITOR"] as string[]).includes(user.role)) throw new Error("Sports imports require OWNER, ADMIN, or EDITOR access");
  return user;
}

export async function previewSportsRosterImport(formData: FormData) {
  const user = await requireSportsOperator();
  const rawPayload = String(formData.get("rawPayload") ?? "").trim();
  if (!rawPayload) throw new Error("Paste a roster JSON payload first");
  const run = await previewRosterImport(rawPayload, user.id);
  revalidatePath("/command-center/sports");
  redirect(`/command-center/sports?view=imports&run=${run.id}`);
}

export async function applySportsRosterImport(formData: FormData) {
  const user = await requireSportsOperator();
  const runId = String(formData.get("runId") ?? "");
  await applyRosterImport(runId, user.id);
  revalidatePath("/command-center/sports");
  redirect(`/command-center/sports?view=imports&run=${runId}`);
}

export async function previewSportsEventStatImport(formData: FormData) {
  const user = await requireSportsOperator();
  const rawPayload = String(formData.get("rawPayload") ?? "").trim();
  if (!rawPayload) throw new Error("Paste an NFL event-stat JSON payload first");
  const run = await previewEventStatImport(rawPayload, user.id);
  revalidatePath("/command-center/sports");
  redirect(`/command-center/sports?view=imports&run=${run.id}`);
}

export async function applySportsEventStatImport(formData: FormData) {
  const user = await requireSportsOperator();
  const runId = String(formData.get("runId") ?? "");
  await applyEventStatImport(runId, user.id);
  revalidatePath("/command-center/sports");
  redirect(`/command-center/sports?view=imports&run=${runId}`);
}
