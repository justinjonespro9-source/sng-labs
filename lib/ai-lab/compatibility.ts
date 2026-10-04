export type CompatibilityInput = {
  brandId: string;
  selectedProgramId?: string | null;
  selectedCampaign?: { id: string } | null;
  selectedActivation?: { id: string; campaignId: string; brandIds: string[] } | null;
  selectedEventId?: string | null;
  selectedOpportunity?: { eventId: string | null; activationId: string | null; campaignIds: string[] } | null;
  relationship?: { campaignIds: string[]; brandIds: string[] } | null;
  resolvedCampaign?: { id: string; programId: string | null; brandIds: string[] } | null;
};

/** Validates that selected records describe one coherent execution. Only records the operator actually selected are compared, so a standalone activation is valid without an Opportunity. */
export function contextCompatibility(input: CompatibilityInput) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { selectedCampaign, selectedActivation, selectedOpportunity, relationship, resolvedCampaign } = input;

  if (input.selectedProgramId && resolvedCampaign?.programId && resolvedCampaign.programId !== input.selectedProgramId) errors.push("Campaign does not belong to the selected Growth Program");
  if (selectedCampaign && selectedActivation && selectedActivation.campaignId !== selectedCampaign.id) errors.push("Activation does not belong to the selected Campaign");
  if (selectedActivation && selectedOpportunity) {
    if (selectedOpportunity.activationId && selectedOpportunity.activationId !== selectedActivation.id) errors.push("Opportunity belongs to a different Activation");
    else if (!selectedOpportunity.activationId && selectedOpportunity.campaignIds.length && !selectedOpportunity.campaignIds.includes(selectedActivation.campaignId)) errors.push("Opportunity is not linked to the Activation's Campaign");
  }
  if (input.selectedEventId && selectedOpportunity?.eventId && selectedOpportunity.eventId !== input.selectedEventId) errors.push("Opportunity does not belong to the selected Event");
  if (selectedCampaign && selectedOpportunity?.campaignIds.length && !selectedOpportunity.campaignIds.includes(selectedCampaign.id)) errors.push("Opportunity does not belong to the selected Campaign");
  if (resolvedCampaign?.brandIds.length && !resolvedCampaign.brandIds.includes(input.brandId)) errors.push("The Campaign does not include the selected Brand");
  if (selectedActivation?.brandIds.length && !selectedActivation.brandIds.includes(input.brandId)) errors.push("The Activation does not include the selected Brand");
  if (relationship && resolvedCampaign && relationship.campaignIds.length && !relationship.campaignIds.includes(resolvedCampaign.id)) errors.push("The Relationship is not linked to the selected Campaign");
  if (relationship?.brandIds.length && !relationship.brandIds.includes(input.brandId)) warnings.push("The Relationship does not list the selected Brand as relevant");

  return { errors, warnings };
}
