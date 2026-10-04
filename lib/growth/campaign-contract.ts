export type CampaignStatus = "PLANNING" | "ACTIVE" | "PAUSED" | "COMPLETE" | "ARCHIVED";

export type CampaignContractInput = {
  ownerId: string | null;
  brandIds: string[];
  objective: string | null;
  primaryAudience: string | null;
  offer: string | null;
  hypothesis: string | null;
  primaryCta: string | null;
  destinationUrl: string | null;
  executionPlan: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  targetCount: number;
};

function present(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

export function isValidDestinationUrl(raw: string | null | undefined) {
  if (!present(raw)) return false;
  try {
    const url = new URL(String(raw).trim());
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Minimum brief a campaign needs before it can be ACTIVE. Product-validation outreach may use a documented execution plan instead of a public URL. */
export function activeCampaignGaps(input: CampaignContractInput) {
  const gaps: string[] = [];
  if (!present(input.ownerId)) gaps.push("Owner");
  if (!input.brandIds.length) gaps.push("At least one brand");
  if (!present(input.objective)) gaps.push("Objective");
  if (!present(input.primaryAudience)) gaps.push("Audience");
  if (!present(input.offer)) gaps.push("Offer");
  if (!present(input.hypothesis)) gaps.push("Hypothesis");
  if (!present(input.primaryCta)) gaps.push("Participation action / CTA");
  if (present(input.destinationUrl) && !isValidDestinationUrl(input.destinationUrl)) gaps.push("Destination URL must be a valid http(s) address");
  else if (!present(input.destinationUrl) && !present(input.executionPlan)) gaps.push("Destination URL or documented non-web execution plan");
  if (!input.startsAt) gaps.push("Start date");
  if (!input.endsAt) gaps.push("Deadline");
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) gaps.push("Deadline must be after the start date");
  if (input.targetCount < 1) gaps.push("At least one numeric target with a metric definition");
  return gaps;
}

export const materialStrategyFields = ["ownerId", "objective", "objectiveType", "primaryAudience", "offer", "hypothesis", "primaryCta", "destinationUrl", "executionPlan", "startsAt", "endsAt", "brandIds"] as const;
type MaterialField = (typeof materialStrategyFields)[number];
export type MaterialSnapshot = Record<MaterialField, string | Date | string[] | null>;

function normalize(value: string | Date | string[] | null) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return String(value.getTime());
  if (Array.isArray(value)) return [...value].sort().join("|");
  return value.trim();
}

export function changedMaterialFields(before: MaterialSnapshot, after: MaterialSnapshot) {
  return materialStrategyFields.filter((field) => normalize(before[field]) !== normalize(after[field]));
}

/** Entering ACTIVE always requires the contract; an already-ACTIVE campaign must satisfy it again only when strategy changes. Legacy ACTIVE campaigns are never auto-paused. */
export function requiresActiveContract(previousStatus: CampaignStatus | null, nextStatus: CampaignStatus, materialChange: boolean) {
  if (nextStatus !== "ACTIVE") return false;
  return previousStatus !== "ACTIVE" || materialChange;
}

export function assertActiveCampaignContract(input: CampaignContractInput) {
  const gaps = activeCampaignGaps(input);
  if (gaps.length) throw new Error(`Campaign cannot be ACTIVE until the brief is complete. Missing: ${gaps.join(", ")}`);
}

export function parseNonNegativeInteger(raw: FormDataEntryValue | string | null | undefined, label: string, max = 2_000_000_000) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error(`${label} must be a non-negative whole number`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) throw new Error(`${label} is too large`);
  return parsed;
}

/** Accepts "12.34" style currency input and stores integer minor units; blank stays unknown (null), "0" stays an explicit zero. */
export function parseMoneyToMinor(raw: FormDataEntryValue | string | null | undefined, label: string) {
  const value = String(raw ?? "").trim().replace(/,/g, "");
  if (!value) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`${label} must be a non-negative amount with at most two decimals`);
  const [whole, fraction = ""] = value.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > 2_000_000_000) throw new Error(`${label} is too large`);
  return minor;
}

export function formatMinor(minor: number | null | undefined, currency: string | null | undefined) {
  if (minor === null || minor === undefined) return "Unknown";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(minor / 100);
}
