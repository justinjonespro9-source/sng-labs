"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { resolveGenerationContext } from "@/lib/ai-lab/context";
import { createDraftFromGenerationRun } from "@/lib/ai-lab/draft";
import { generateMarketingExecution } from "@/lib/ai-lab/provider";
import { AI_LAB_GENERATION_VERSION, generationInputSchema, type AiLabActionState } from "@/lib/ai-lab/schema";
import { prisma } from "@/lib/prisma";

async function requireEditor() {
  const user = await requireCommandCenterUser();
  if (!new Set(["OWNER", "ADMIN", "EDITOR"]).has(user.role)) throw new Error("Forbidden");
  return user;
}

function optional(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function publicError(error: unknown) {
  if (error instanceof ZodError) return error.issues[0]?.message || "Invalid generation input";
  if (error instanceof Error) return error.message;
  return "Generation failed";
}

export async function generateExecutionAction(_previous: AiLabActionState, formData: FormData): Promise<AiLabActionState> {
  const user = await requireEditor();
  let runId: string | undefined;
  try {
    const input = generationInputSchema.parse({
      brandId: formData.get("brandId"),
      channel: formData.get("channel"),
      growthProgramId: optional(formData.get("growthProgramId")),
      campaignId: optional(formData.get("campaignId")),
      activationId: optional(formData.get("activationId")),
      opportunityId: optional(formData.get("opportunityId")),
      relationshipId: optional(formData.get("relationshipId")),
      audienceSegment: optional(formData.get("audienceSegment")),
      operatorContext: optional(formData.get("operatorContext")),
      operatorContextTrust: optional(formData.get("operatorContextTrust")) || undefined,
    });
    const context = await resolveGenerationContext(input);
    const run = await prisma.generationRun.create({ data: {
      createdById: user.id,
      brandId: input.brandId,
      campaignId: context.campaign?.id || null,
      activationId: context.activation?.id || null,
      opportunityId: input.opportunityId || null,
      relationshipId: input.relationshipId || null,
      channel: input.channel,
      audienceSegment: input.audienceSegment,
      operatorContext: input.operatorContext,
      operatorContextTrust: input.operatorContextTrust,
      resolvedContext: context as unknown as Prisma.InputJsonValue,
      generationVersion: AI_LAB_GENERATION_VERSION,
      status: "PENDING",
    } });
    runId = run.id;
    const generated = await generateMarketingExecution(context);
    await prisma.generationRun.update({ where: { id: run.id }, data: {
      provider: generated.provider,
      model: generated.model,
      recommendation: generated.output.recommendation,
      structuredOutput: generated.output as Prisma.InputJsonValue,
      status: "SUCCEEDED",
      errorMessage: null,
    } });
    await prisma.auditEvent.create({ data: { actorId: user.id, action: "ai_lab.generate", entityType: "GenerationRun", entityId: run.id, metadata: { recommendation: generated.output.recommendation, generationVersion: AI_LAB_GENERATION_VERSION } } });
  } catch (error) {
    if (runId) await prisma.generationRun.update({ where: { id: runId }, data: { status: "FAILED", errorMessage: publicError(error).slice(0, 10000) } });
    return { runId, error: publicError(error) };
  }
  redirect(`/command-center/ai-lab?run=${runId}`);
}

export async function createDraftFromExecutionAction(runId: string) {
  const user = await requireEditor();
  const draftId = await prisma.$transaction((tx) => createDraftFromGenerationRun(tx, runId, user.id), { isolationLevel: "Serializable" });
  revalidatePath("/command-center/ai-lab");
  revalidatePath("/command-center/queue");
  redirect(`/command-center/queue?created=${draftId}`);
}
