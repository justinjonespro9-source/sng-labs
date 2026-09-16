import type { Prisma } from "@prisma/client";
import { generatedExecutionSchema } from "./schema";

export type DraftableRun = {
  status: string;
  recommendation: string | null;
  opportunityId: string | null;
  brandId: string | null;
  contentId: string | null;
};

export function draftCreationDecision(run: DraftableRun) {
  if (run.contentId) return { kind: "EXISTING" as const, contentId: run.contentId };
  if (run.status !== "SUCCEEDED") throw new Error("Only successful generation runs can create Content");
  if (run.recommendation !== "CREATE") throw new Error("Only CREATE recommendations can become Content");
  if (!run.opportunityId) throw new Error("Choose an existing Opportunity before creating a Content draft");
  if (!run.brandId) throw new Error("The run's Brand no longer exists");
  return { kind: "CREATE" as const };
}

export async function createDraftFromGenerationRun(tx: Prisma.TransactionClient, runId: string, actorId: string) {
  await tx.$queryRaw`SELECT "id" FROM "GenerationRun" WHERE "id" = ${runId} FOR UPDATE`;
  const run = await tx.generationRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("Generation run not found");
  const decision = draftCreationDecision(run);
  if (decision.kind === "EXISTING") return decision.contentId;

  const output = generatedExecutionSchema.parse(run.structuredOutput);
  const snapshot = run.resolvedContext as Record<string, unknown>;
  const brand = snapshot.brand as { name?: string } | undefined;
  const angle = await tx.brandAngle.upsert({
    where: { opportunityId_brandId: { opportunityId: run.opportunityId!, brandId: run.brandId! } },
    update: { objective: `Create a ${run.channel} execution for ${brand?.name || "the selected Brand"}`, hook: output.editorialAngle, rationale: `${output.reason}\n\nWhy now: ${output.whyNow}`, suggestedVisual: output.visualBrief || null },
    create: { opportunityId: run.opportunityId!, brandId: run.brandId!, objective: `Create a ${run.channel} execution for ${brand?.name || "the selected Brand"}`, hook: output.editorialAngle, rationale: `${output.reason}\n\nWhy now: ${output.whyNow}`, suggestedVisual: output.visualBrief || null },
  });
  const draft = await tx.contentDraft.create({ data: {
    brandAngleId: angle.id,
    status: "DRAFT",
    objective: `Create a ${run.channel} execution for ${brand?.name || "the selected Brand"}`,
    hook: output.editorialAngle,
    rationale: `${output.reason}\n\nWhy now: ${output.whyNow}`,
    body: output.draftCopy,
    visualBrief: output.visualBrief || null,
    callToAction: output.cta || null,
    modelProvider: run.provider,
    modelName: run.model,
    promptVersion: run.generationVersion,
    sourceFacts: { generationRunId: run.id, generationVersion: run.generationVersion, channel: run.channel, evidenceUsed: output.evidenceUsed, assumptions: output.assumptions, warnings: output.warnings, resolvedContext: run.resolvedContext } as Prisma.InputJsonValue,
  } });
  await tx.generationRun.update({ where: { id: run.id }, data: { contentId: draft.id } });
  await tx.opportunity.update({ where: { id: run.opportunityId! }, data: { status: "DEVELOPING" } });
  await tx.auditEvent.create({ data: { actorId, action: "ai_lab.content.create", entityType: "ContentDraft", entityId: draft.id, metadata: { generationRunId: run.id, generationVersion: run.generationVersion } } });
  return draft.id;
}
