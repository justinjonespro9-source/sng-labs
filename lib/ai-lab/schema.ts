import { z } from "zod";

export const AI_LAB_GENERATION_VERSION = "ai-lab-v1";

export const aiLabChannels = [
  "X",
  "LINKEDIN",
  "INSTAGRAM",
  "TIKTOK",
  "FACEBOOK",
  "EMAIL_OUTREACH",
  "MEDIA_PITCH",
  "INTERNAL_STRATEGY",
] as const;

export const aiLabChannelSchema = z.enum(aiLabChannels);
export const operatorContextTrustSchema = z.enum(["OPERATOR_SUPPLIED", "HYPOTHETICAL"]);
export const generationRecommendationSchema = z.enum(["CREATE", "DO_NOT_POST", "NEEDS_MORE_CONTEXT"]);

const optionalId = z.string().trim().min(1).optional().or(z.literal("")).transform((value) => value || undefined);

export const generationInputSchema = z.object({
  brandId: z.string().trim().min(1),
  channel: aiLabChannelSchema,
  growthProgramId: optionalId,
  campaignId: optionalId,
  activationId: optionalId,
  opportunityId: optionalId,
  relationshipId: optionalId,
  audienceSegment: z.string().trim().max(1000).optional().transform((value) => value || undefined),
  operatorContext: z.string().trim().max(10000).optional().transform((value) => value || undefined),
  operatorContextTrust: operatorContextTrustSchema.optional(),
}).superRefine((value, ctx) => {
  if (value.operatorContext && !value.operatorContextTrust) {
    ctx.addIssue({ code: "custom", path: ["operatorContextTrust"], message: "Choose whether additional context is operator-supplied or hypothetical" });
  }
});

export type GenerationInput = z.infer<typeof generationInputSchema>;

export const generatedExecutionSchema = z.object({
  recommendation: generationRecommendationSchema,
  reason: z.string().trim().min(1).max(5000),
  whyNow: z.string().trim().max(5000),
  editorialAngle: z.string().trim().max(5000),
  draftCopy: z.string().trim().max(20000),
  visualBrief: z.string().trim().max(10000),
  cta: z.string().trim().max(2000),
  recommendedChannel: aiLabChannelSchema,
  timing: z.string().trim().min(1).max(2000),
  evidenceUsed: z.array(z.string().trim().min(1).max(2000)).max(50),
  assumptions: z.array(z.string().trim().min(1).max(2000)).max(50),
  warnings: z.array(z.string().trim().min(1).max(2000)).max(50),
}).superRefine((value, ctx) => {
  if (value.recommendation === "CREATE") {
    for (const key of ["whyNow", "editorialAngle", "draftCopy"] as const) {
      if (!value[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required for CREATE` });
    }
  }
});

export type GeneratedExecution = z.infer<typeof generatedExecutionSchema>;

export const generatedExecutionJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["recommendation", "reason", "whyNow", "editorialAngle", "draftCopy", "visualBrief", "cta", "recommendedChannel", "timing", "evidenceUsed", "assumptions", "warnings"],
  properties: {
    recommendation: { type: "string", enum: ["CREATE", "DO_NOT_POST", "NEEDS_MORE_CONTEXT"] },
    reason: { type: "string" },
    whyNow: { type: "string" },
    editorialAngle: { type: "string" },
    draftCopy: { type: "string" },
    visualBrief: { type: "string" },
    cta: { type: "string" },
    recommendedChannel: { type: "string", enum: [...aiLabChannels] },
    timing: { type: "string" },
    evidenceUsed: { type: "array", items: { type: "string" } },
    assumptions: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

export type AiLabActionState = {
  runId?: string;
  error?: string;
};
