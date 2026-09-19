export type RosterMembershipIdentity = {
  seasonId: string;
  participantId: string;
  teamId: string;
  active: boolean;
};

export function membershipsToDeactivate(
  memberships: RosterMembershipIdentity[],
  next: RosterMembershipIdentity,
) {
  if (!next.active) return [];
  return memberships.filter(
    (membership) =>
      membership.active &&
      membership.seasonId === next.seasonId &&
      membership.participantId === next.participantId &&
      membership.teamId !== next.teamId,
  );
}

export function activeMembershipDeactivationWhere(next: RosterMembershipIdentity) {
  if (!next.active) return null;
  return {
    seasonId: next.seasonId,
    participantId: next.participantId,
    teamId: { not: next.teamId },
    active: true,
  };
}
