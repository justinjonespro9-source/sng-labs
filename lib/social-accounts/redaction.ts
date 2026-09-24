const secretKeyPattern = /(access.?token|refresh.?token|id.?token|client.?secret|signing.?secret|webhook.?url|authorization|cookie|password|credential)/i;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const webhookPattern = /https:\/\/(?:discord(?:app)?\.com)\/api\/webhooks\/[^\s"']+/gi;

export function redactSecretText(value: string) {
  return value.replace(bearerPattern, "Bearer [REDACTED]").replace(webhookPattern, "[REDACTED_WEBHOOK]");
}

export function redactSocialSecrets(value: unknown): unknown {
  if (typeof value === "string") return redactSecretText(value);
  if (Array.isArray(value)) return value.map(redactSocialSecrets);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretKeyPattern.test(key) ? "[REDACTED]" : redactSocialSecrets(item)]));
}

export function assertNoSecretMaterial(value: unknown) {
  const serialized = JSON.stringify(value);
  if (/Bearer\s+(?!\[REDACTED\])[A-Za-z0-9]/i.test(serialized) || /discord(?:app)?\.com\/api\/webhooks/i.test(serialized)) {
    throw new Error("Secret material is not permitted in Social Accounts metadata");
  }
}
