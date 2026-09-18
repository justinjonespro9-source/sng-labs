import { describe, expect, it } from "vitest";
import { AI_LAB_GENERATION_VERSION, generatedExecutionSchema, generationInputSchema } from "./schema";

const base = { reason: "A decision", whyNow: "", editorialAngle: "", draftCopy: "", visualBrief: "", cta: "", recommendedChannel: "X", timing: "Do not publish", evidenceUsed: [], assumptions: [], warnings: [] };

describe("AI Lab contracts", () => {
  it("uses one explicit server generation version", () => expect(AI_LAB_GENERATION_VERSION).toBe("ai-lab-v1"));

  it("treats DO_NOT_POST and NEEDS_MORE_CONTEXT as valid without filler copy", () => {
    expect(generatedExecutionSchema.parse({ ...base, recommendation: "DO_NOT_POST" }).draftCopy).toBe("");
    expect(generatedExecutionSchema.parse({ ...base, recommendation: "NEEDS_MORE_CONTEXT" }).draftCopy).toBe("");
  });

  it("requires meaningful draft fields for CREATE", () => {
    expect(() => generatedExecutionSchema.parse({ ...base, recommendation: "CREATE" })).toThrow();
  });

  it("requires a trust label whenever operator context is supplied", () => {
    expect(() => generationInputSchema.parse({ brandId: "brand", channel: "X", operatorContext: "NFL Sunday" })).toThrow();
    expect(generationInputSchema.parse({ brandId: "brand", channel: "X", operatorContext: "NFL Sunday", operatorContextTrust: "HYPOTHETICAL" }).operatorContextTrust).toBe("HYPOTHETICAL");
  });
});
