import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { generateMarketingExecution, getAiProviderAvailability, type MarketingExecutionProvider } from "./provider";

const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.AI_MODEL;
afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.AI_MODEL; else process.env.AI_MODEL = originalModel;
});

describe("AI Lab provider boundary", () => {
  it("reports missing server configuration without making a provider call", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_MODEL;
    expect(getAiProviderAvailability()).toEqual({ configured: false, provider: "openai", model: null });
  });

  it("validates mocked provider output without consuming credits", async () => {
    const provider: MarketingExecutionProvider = { provider: "mock", model: "mock-model", generate: async () => ({ recommendation: "DO_NOT_POST", reason: "No meaningful reason to speak", whyNow: "", editorialAngle: "", draftCopy: "", visualBrief: "", cta: "", recommendedChannel: "X", timing: "Do not publish", evidenceUsed: ["Hypothetical context"], assumptions: [], warnings: [] }) };
    const result = await generateMarketingExecution({} as never, provider);
    expect(result.output.recommendation).toBe("DO_NOT_POST");
    expect(result.provider).toBe("mock");
  });

  it("rejects malformed provider output", async () => {
    const provider: MarketingExecutionProvider = { provider: "mock", model: "mock-model", generate: async () => ({ recommendation: "CREATE" }) };
    await expect(generateMarketingExecution({} as never, provider)).rejects.toThrow();
  });
});
