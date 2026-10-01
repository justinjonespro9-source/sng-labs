export type FormValues = Record<string, string | string[]>;

export type FormActionState = { error: string | null; values: FormValues | null; attempt: number };

export const initialFormActionState: FormActionState = { error: null, values: null, attempt: 0 };

/** Captures submitted text values so a form can be re-rendered with what the operator typed after a rejected submission. React's internal `$ACTION_*` fields and files are excluded. */
export function submittedValues(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$") || typeof value !== "string") continue;
    const existing = values[key];
    if (existing === undefined) values[key] = value;
    else values[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return values;
}

/** Only same-app Command Center paths are accepted as post-submit destinations. */
export function safeReturnTo(formData: FormData, fallback: string) {
  const value = String(formData.get("returnTo") || "");
  return /^\/command-center(\/|\?|$)/.test(value) && !value.includes("//") && !value.includes("\\") ? value : fallback;
}

export function submittedText(values: FormValues | null, name: string): string | undefined {
  const value = values?.[name];
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export function submittedList(values: FormValues | null, name: string): string[] | undefined {
  if (!values) return undefined;
  const value = values[name];
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
