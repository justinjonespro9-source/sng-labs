export type AiLabOpportunityLineage = {
  id: string;
  eventId: string | null;
  activation: {
    id: string;
    campaign: { id: string; programId: string | null };
  } | null;
  campaigns: Array<{
    campaign: { id: string; programId: string | null };
  }>;
};

export function resolveAiLabSetupDefaults(input: {
  brandId?: string;
  opportunityId?: string;
  eventId?: string;
  growthProgramId?: string;
  campaignId?: string;
  activationId?: string;
  opportunities: AiLabOpportunityLineage[];
}) {
  const opportunity = input.opportunities.find((item) => item.id === input.opportunityId);
  const activationCampaign = opportunity?.activation?.campaign;
  const relatedCampaign = opportunity?.campaigns[0]?.campaign;
  const campaign = activationCampaign ?? relatedCampaign;

  return {
    brandId: input.brandId,
    opportunityId: input.opportunityId,
    eventId: input.eventId ?? opportunity?.eventId ?? undefined,
    activationId: input.activationId ?? opportunity?.activation?.id ?? undefined,
    campaignId: input.campaignId ?? campaign?.id ?? undefined,
    growthProgramId: input.growthProgramId ?? campaign?.programId ?? undefined,
  };
}
