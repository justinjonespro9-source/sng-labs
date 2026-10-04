export const portfolioAllocations = ["PRIMARY_PUSH", "ACTIVE_TEST", "PREP", "VALIDATION", "MAINTENANCE", "HOLD"] as const;
export type PortfolioAllocation = (typeof portfolioAllocations)[number];

export const portfolioAllocationLabels: Record<PortfolioAllocation, string> = {
  PRIMARY_PUSH: "Primary push",
  ACTIVE_TEST: "Active test",
  PREP: "Prep",
  VALIDATION: "Validation",
  MAINTENANCE: "Maintenance",
  HOLD: "Hold",
};

export type CurrentPriority = { brandName: string; allocation: PortfolioAllocation; weeklyHours: number | null };

/** Multiple primary pushes are allowed; the operator sees the capacity cost instead of the system choosing a winner. */
export function portfolioCapacityWarnings(current: CurrentPriority[], weeklyCapacityHours?: number | null) {
  const warnings: string[] = [];
  const primary = current.filter((priority) => priority.allocation === "PRIMARY_PUSH");
  if (primary.length > 1) warnings.push(`${primary.length} brands are marked Primary push (${primary.map((priority) => priority.brandName).join(", ")}). Attention will be split.`);
  const plannedHours = current.reduce((sum, priority) => sum + (priority.weeklyHours ?? 0), 0);
  if (weeklyCapacityHours && plannedHours > weeklyCapacityHours) warnings.push(`Planned weekly hours (${plannedHours}) exceed stated capacity (${weeklyCapacityHours}).`);
  return warnings;
}

export function parseWeeklyHours(raw: FormDataEntryValue | string | null | undefined) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const hours = Number(value);
  if (!Number.isInteger(hours) || hours < 0 || hours > 168) throw new Error("Weekly hours must be a whole number between 0 and 168");
  return hours;
}
