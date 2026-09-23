# Sports Data Hub V1D scoring operations

V1D keeps canonical facts immutable and separate from fantasy interpretation:

`canonical factual performance → immutable input snapshot → versioned ruleset + engine → derived performance → weekly positional result`

## Initial ruleset

- Name: NFL Half-PPR — SNG V1
- Code/version: `SNG_NFL_HALF_PPR@1`
- Engine: `sng-nfl-fantasy-engine/1.0.0`
- Precision: signed integer hundredths; decimal values are projections only.
- Ranking: competition rank with exact-hundredths ties. Top 3/10/15 predicates use rank, so ties at a cutoff remain included.
- Participation: `PARTICIPATED_WITH_STATS` and `PARTICIPATED_ZERO` are scorable. Unknown and DNP fail closed.
- D/ST: `pointsAllowed` is read as an explicit V1C.1 fact. Only its tier interpretation occurs in V1D.

Rulesets are immutable by `(code, version)` and content checksum. Unknown identifiers fail closed. Preview creates a DRAFT ruleset only; activation and publication are separate Production-controlled operations.

## Preview and replay

Run `npm run sports:preview-scoring -- 2026 1` against an isolated migrated Preview database. A run fingerprint covers sport, league, season, week, mode, ruleset checksum, engine version, and the complete input-set checksum. Replaying identical inputs returns the existing run without new snapshots, results, or weekly entries.

Each derived performance points to its exact factual snapshot. When a factual correction produces a changed fingerprint, the new derived performance references the prior result through `supersedesId`; the old result is retained.

## Weekly operating gate

1. Verify canonical factual coverage and Data Quality.
2. Execute PREVIEW or SHADOW calculation.
3. Verify input, ruleset, run, performance, and result-set fingerprints.
4. Compare points and competition ranks against executable RankEyeQ and FantasyTrack engines.
5. Investigate every mismatch; do not use display rounding for parity.
6. Replay identical input and verify no writes.
7. Obtain explicit Production migration/activation/publication authorization.

The shared derived models use generic sport, league, season, participant, event, ruleset, input snapshot, derived performance, and result-set concepts. NFL factual adapters and the NFL engine remain sport-specific so future NBA, NHL, MLB, and NCAA engines do not inherit NFL fields.
