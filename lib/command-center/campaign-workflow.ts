export type ActivationContext = { campaignId: string; marketId: string | null; teamId: string | null } | null;

export function mergeActivationContext(selected: { campaignIds: string[]; marketIds: string[]; teamIds: string[] }, activation: ActivationContext) {
  return {
    campaignIds: [...new Set([...selected.campaignIds, ...(activation ? [activation.campaignId] : [])])],
    marketIds: [...new Set([...selected.marketIds, ...(activation?.marketId ? [activation.marketId] : [])])],
    teamIds: [...new Set([...selected.teamIds, ...(activation?.teamId ? [activation.teamId] : [])])],
  };
}
