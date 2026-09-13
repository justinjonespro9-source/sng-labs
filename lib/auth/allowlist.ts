export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function parseAllowedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map(normalizeEmail)
      .filter(Boolean),
  );
}

export function isAllowedEmail(email: string | null | undefined, raw = process.env.AUTH_ALLOWED_EMAILS): boolean {
  if (!email) return false;
  return parseAllowedEmails(raw).has(normalizeEmail(email));
}

export function roleForAllowedEmail(email: string | null | undefined, raw = process.env.AUTH_ALLOWED_EMAILS) {
  const ordered = [...parseAllowedEmails(raw)];
  const normalized = email ? normalizeEmail(email) : "";
  return ordered[0] === normalized ? "OWNER" : "EDITOR";
}
