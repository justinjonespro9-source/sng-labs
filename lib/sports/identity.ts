export type IdentityCandidate = {
  id: string;
  canonicalName: string;
  kind: "PLAYER" | "TEAM_DEFENSE";
  aliases: string[];
  externalIdentities: Array<{ provider: string; externalId: string }>;
  memberships: Array<{ league: string; year: number; teamAbbreviation: string; position: string }>;
};

export type IdentityInput = {
  provider?: string | null;
  externalId?: string | null;
  name: string;
  kind?: "PLAYER" | "TEAM_DEFENSE";
  league: string;
  year: number;
  teamAbbreviation?: string | null;
  position?: string | null;
};

export function normalizeParticipantName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type IdentityResolution =
  | { kind: "MATCHED"; candidate: IdentityCandidate; method: "EXTERNAL_ID" | "ALIAS" | "COMPOSITE" }
  | { kind: "CREATE" }
  | { kind: "AMBIGUOUS"; candidateIds: string[]; reason: string };

export function resolveParticipantIdentity(
  input: IdentityInput,
  candidates: IdentityCandidate[],
): IdentityResolution {
  const participantKind = input.kind ?? "PLAYER";
  const sameKind = candidates.filter((candidate) => candidate.kind === participantKind);
  if (input.provider && input.externalId) {
    const external = sameKind.filter((candidate) =>
      candidate.externalIdentities.some(
        (identity) => identity.provider === input.provider && identity.externalId === input.externalId,
      ),
    );
    if (external.length === 1) return { kind: "MATCHED", candidate: external[0], method: "EXTERNAL_ID" };
    if (external.length > 1) return { kind: "AMBIGUOUS", candidateIds: external.map((x) => x.id), reason: "Duplicate provider identity" };
  }

  const normalized = normalizeParticipantName(input.name);
  const aliases = sameKind.filter((candidate) =>
    [candidate.canonicalName, ...candidate.aliases].some(
      (name) => normalizeParticipantName(name) === normalized,
    ),
  );
  if (aliases.length === 1) return { kind: "MATCHED", candidate: aliases[0], method: "ALIAS" };

  const composite = aliases.filter((candidate) =>
    candidate.memberships.some(
      (membership) =>
        membership.league === input.league &&
        membership.year === input.year &&
        (!input.teamAbbreviation || membership.teamAbbreviation === input.teamAbbreviation) &&
        (!input.position || membership.position === input.position),
    ),
  );
  if (composite.length === 1) return { kind: "MATCHED", candidate: composite[0], method: "COMPOSITE" };
  if (aliases.length > 0) {
    return {
      kind: "AMBIGUOUS",
      candidateIds: aliases.map((candidate) => candidate.id),
      reason: "Name or alias matched multiple canonical participants",
    };
  }
  return { kind: "CREATE" };
}
