import "server-only";

import { AI_LAB_SYSTEM_RULES, buildGenerationInput } from "./prompt";
import { generatedExecutionJsonSchema } from "./schema";
import type { MarketingExecutionProvider } from "./provider";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

function responseText(payload: OpenAiResponse) {
  if (payload.output_text) return payload.output_text;
  return payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
}

export function createOpenAiProvider(config: { apiKey: string; model: string }): MarketingExecutionProvider {
  return {
    provider: "openai",
    model: config.model,
    async generate(context) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          instructions: AI_LAB_SYSTEM_RULES,
          input: buildGenerationInput(context),
          text: { format: { type: "json_schema", name: "marketing_execution", strict: true, schema: generatedExecutionJsonSchema } },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const payload = await response.json() as OpenAiResponse;
      if (!response.ok) throw new Error(payload.error?.message || `Model provider returned ${response.status}`);
      const text = responseText(payload);
      if (!text) throw new Error("Model provider returned no structured output");
      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new Error("Model provider returned malformed structured output");
      }
    },
  };
}
