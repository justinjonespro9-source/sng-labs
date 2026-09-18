export function getGoogleAuthConfig(env: Record<string, string | undefined> = process.env) {
  const clientId = env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = env.AUTH_GOOGLE_SECRET?.trim();
  const missing = [!clientId ? "AUTH_GOOGLE_ID" : null, !clientSecret ? "AUTH_GOOGLE_SECRET" : null].filter((value): value is string => Boolean(value));
  return {
    clientId,
    clientSecret,
    configured: missing.length === 0,
    missing,
  };
}
