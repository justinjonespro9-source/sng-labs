export const openOpportunityStatuses = ["NEW", "REVIEWED", "DEVELOPING", "QUEUED"] as const;

/** Home shows only actionable Opportunities; the full feed keeps history. */
export function openOpportunityWhere(now: Date) {
  return { status: { in: [...openOpportunityStatuses] }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
}

export function isOpenOpportunity(row: { status: string; expiresAt: Date | null }, now: Date) {
  return (openOpportunityStatuses as readonly string[]).includes(row.status) && (!row.expiresAt || row.expiresAt > now);
}

export type HealthSnapshotRow = { id: string; socialAccountId: string; state: "HEALTHY" | "WATCH" | "AT_RISK"; calculatedAt: Date };

/** Latest editorial/distribution health snapshot per account, deterministic on calculatedAt then id. */
export function latestSnapshotPerAccount<T extends HealthSnapshotRow>(rows: T[]) {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const current = latest.get(row.socialAccountId);
    if (!current || row.calculatedAt > current.calculatedAt || (row.calculatedAt.getTime() === current.calculatedAt.getTime() && row.id > current.id)) latest.set(row.socialAccountId, row);
  }
  return latest;
}

export function accountHealthSummary(accountIds: string[], rows: HealthSnapshotRow[]) {
  const latest = latestSnapshotPerAccount(rows);
  const summary = { healthy: 0, watch: 0, atRisk: 0, unknown: 0, onWatch: 0 };
  for (const accountId of accountIds) {
    const state = latest.get(accountId)?.state;
    if (!state) summary.unknown += 1;
    else if (state === "HEALTHY") summary.healthy += 1;
    else if (state === "WATCH") summary.watch += 1;
    else summary.atRisk += 1;
  }
  summary.onWatch = summary.watch + summary.atRisk;
  return summary;
}
