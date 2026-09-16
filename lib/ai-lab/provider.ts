import "server-only";

import type { ResolvedGenerationContext } from "./context";
import { generatedExecutionSchema, type GeneratedExecution } from "./schema";
import { createOpenAiProvider } from "./openai-provider";

export class AiProviderConfigurationError extends Error {}

export type MarketingExecutionProvider = {
  provider: string;
  model: string;
  generate(context: ResolvedGenerationContext): Promise<unknown>;
};

export function getAiProviderAvailability() {
  const model = process.env.AI_MODEL?.trim();
  const configured = Boolean(process.env.OPENAI_API_KEY?.trim() && model);
  return { configured, provider: "openai", model: model || null };
}

export function getConfiguredProvider(): MarketingExecutionProvider {
  const availability = getAiProviderAvailability();
  if (!availability.configured || !availability.model) {
    throw new AiProviderConfigurationError("Generation is unavailable. Configure OPENAI_API_KEY and AI_MODEL on the server.");
  }
  return createOpenAiProvider({ apiKey: process.env.OPENAI_API_KEY!, model: availability.model });
}

export async function generateMarketingExecution(context: ResolvedGenerationContext, provider: MarketingExecutionProvider = getConfiguredProvider()): Promise<{ output: GeneratedExecution; provider: string; model: string }> {
  const raw = await provider.generate(context);
  return { output: generatedExecutionSchema.parse(raw), provider: provider.provider, model: provider.model };
}
