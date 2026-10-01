# Canonical NFL weekly export V1

Status: implemented locally; Production is gated. Contract `sng-canonical-nfl-weekly-performance/1`.

## Authority and scope

Calculation mode/status and publication authority are separate. Only a supported ACTIVE `SNG_NFL_HALF_PPR@1` ruleset, engine `sng-nfl-fantasy-engine/1.0.0`, frozen policy `sng-nfl-weekly-position-eligibility/1.0.0`, COMPLETED SHADOW calculation, passing full-week readiness and explicit OWNER/ADMIN acceptance can produce an artifact. PUBLISHED is not a calculation option. Historical SHADOW runs must be recalculated with reviewed frozen eligibility; their flags do not prove readiness.

The existing half-PPR scoring coefficients, integer hundredths, competition ties and participation rules are unchanged. DNP/UNKNOWN are never scored. Verified nonparticipants have null points/rank and stay outside ranked fields. Downstream game-specific zero/DNP rules are a separate consumer decision.

## Evidence review

`manifestSchema` in `lib/sports/scoring/export-schema.ts` is the versioned strict input contract. Operators supply reviewed evidence; no source lookup or fuzzy identity repair runs automatically. The Command Center takes manifest JSON and a review reason. OWNER/ADMIN review records the authenticated actor, server time, observation fingerprint and immutable manifest/participation records.

Required manifest objects:

- `contractVersion: sng-weekly-coverage-manifest/1`, `league: NFL`, `season`, `seasonType: REG`, `week`, exact `positionPolicyVersion`.
- `scheduleEvidence`, `populationEvidence`, `sources[]` and `consumerContract.evidence`: label, reference, 64 lowercase hexadecimal SHA-256 checksum, ISO UTC observedAt. These identify reviewed immutable source evidence. A reference URL alone is insufficient.
- `scope: ALL_WEEKLY_ELIGIBLE_SCORABLE_AND_UNRANKED_DISPOSITIONS`; reviewed channels OFFENSE, DEFENSE, SPECIAL_TEAMS.
- Every expected event: stable key, home/away team keys, PLAYED/CANCELLED/MOVED_OUT_OF_WEEK disposition, independent finality evidence, exact player/defense participant-ID populations, each explicit pointsAllowed value and evidence. Relevant source-reported rows and roster/source additions must be reconciled. Count-only assertions do not pass.
- Every participant: stable ID/kind, frozen weekly position/team/event (nullable event for a bye or no assignment), sourcePosition, eligibilityEvidence, verified provider identities with evidence, participation state/proof/disposition and declared channels.
- Consumer crosswalk: exact player provider and `sng-team` defense provider, with reviewed evidence. All stored verified namespaces must be included. TEAM_DEFENSE externalId must equal its stable teamKey. Washington WAS→WSH and source LA→LAR normalization remain explicit; names never resolve export identity.

States: PARTICIPATED_WITH_STATS; PARTICIPATED_ZERO; VERIFIED_NON_PARTICIPANT; UNKNOWN_INCOMPLETE; ABSENT_UNRESOLVED. Scorable states require complete reviewed factual lines. Positive snaps alone are insufficient. DNP requires OFFICIAL_INACTIVE or EXHAUSTIVE_GAME_PARTICIPATION (all relevant channels). BYE/CANCELLED_GAME/MOVED_OUT_OF_WEEK/NO_ROSTER_ASSIGNMENT need WEEK_DISPOSITION evidence. No absence-to-DNP conversion exists.

The manifest covers the entire current season roster/source universe. Later roster changes invalidate an unaccepted review; previously accepted artifacts remain frozen. Scoring selects the frozen weekly position rather than mutable latest roster membership. Dual roles require one explicit reviewed V1 fantasy position; this project does not introduce multi-position semantics.

## Full-week readiness

The service reads all relevant events/facts, current identity and roster evidence, applied/correction imports with resolved ingestion records, and all open sports quality issues including unscoped issues. It compares exact identity sets and source provenance, blocks provisional/incomplete facts, verifies both defense identities and pointsAllowed evidence, checks all participation channels and frozen population dispositions, and verifies persisted V1 definition/checksum/engine. All open issues block V1; there is no silent exception waiver.

Run validation recomputes every input/source revision/derived result fingerprint, compiled-engine score/components, run fingerprint, full result-set checksum and competition-rank/tie invariants. Exactly QB/RB/WR/TE/DEF fields are required, including empty descriptors if a legitimate expected scorable field is empty. Fields are never limited to UI previews.

Acceptance runs in a serializable transaction, takes a per-series advisory lock, rechecks source observation against manifest and submitted review fingerprint, and uses a partial unique index for one current accepted publication. No stale review may become authoritative. Failed acceptance rolls back all publication/authority/audit changes.

## Envelope and payload

Envelope: `schemaVersion`, `serializationVersion: sng-canonical-json/1`, immutable `artifactId`, stable `seriesKey`, positive `revision`, nullable `supersedesArtifactId`, persisted `generatedAt`, `contentChecksumAlgorithm: SHA-256`, `contentChecksum`, `payload`.

Payload: `week`, supported persisted `ruleset` definition/status/checksum, `engine` version/position-policy version, `run` IDs/mode/status/fingerprints, `acceptance` actor/time/reason/manifest/readiness authority, `coverage` manifest and readiness checks, canonical `events`, frozen applied `sources` including component provenance and resolved ingestion records, `participationLedger`, five complete `resultSets`.

Each result set carries stored and exported-row checksums, policy, field size, finality, readiness checksum and all entries. Entries include canonical/external identity, weekly position/team/opponent/event, participation/source finality, integer pointsHundredths, competition rank, tie key/size, ordinal, snapshot/derived IDs and fingerprints, frozen eligibility, normalized facts/components and source ingestion/revision provenance. DEF also includes explicit pointsAllowed evidence and OPPONENT_OFFICIAL_FINAL_GAME_TOTAL policy. Decimal display projections do not participate in equality or ranking.

## Serialization and verification

The export serializer is separate from legacy `canonical-json.ts`; historical fingerprints are unchanged. UTF-8 bytes contain recursive plain-object keys sorted by JavaScript UTF-16 lexical ordering, explicit nulls, booleans, strings and safe integers. It rejects dates, undefined, nonfinite/fractional/unsafe numbers and other object classes. Arrays retain contract order: resultSets QB/RB/WR/TE/DEF; entries displayOrdinal; ledger participantId; observation sources/participants sorted by ID; reviewed manifest arrays retain their frozen submitted order. Locale-dependent comparison is not used for export object keys.

SHA-256 hashes the canonical envelope **excluding `contentChecksum` itself**. The resulting canonical file includes that digest. It is not a SHA-256 hash of its self-containing final file; consumers must remove the digest field and canonicalize the remainder. `verifyCanonicalArtifact` validates exact bytes/digest, ruleset/engine, ledger/populations, identity/eligibility, factual engine output, source/input/result/run/result-set checksums and competition ties. Use the displayed digest in manual import review. No runtime SNG database request is required for these checks.

Checksums establish integrity, not publisher authenticity or current revocation status. V1 trust is authenticated SNG download plus operator verification. A historical withdrawn/superseded artifact retains its original ACCEPTED bytes; download responds with `X-SNG-Publication-State`. The operator must not introduce it as current authority. Future signing/transfer may extend the envelope; none is implemented.

## Revision and withdrawal

Series: `NFL:REG:{season}:{week}:SNG_NFL_HALF_PPR@1:{policyVersion}`. A publication stores immutable bytes/checksum, accepted actor/time/reason, manifest/run IDs and predecessor. Repeated acceptance of the same current run/manifest is idempotent. Repeat download creates no revision and returns identical stored bytes.

Official correction uses the existing separately authorized factual correction path. This feature does not modify factual ingestion or event finality behavior. Supply refreshed full evidence, calculate a new SHADOW run when inputs/manifest change, review and accept revision N+1. Prior immutable bytes are retained; supersession affects separate authority metadata. Identity/evidence revisions can produce a new artifact with unchanged points. No automatic product push/import/regrade occurs.

OWNER/ADMIN withdrawal requires a reason and audit event. Only ACCEPTED→SUPERSEDED/WITHDRAWN transitions are allowed. Database triggers reject evidence updates/deletion and all edits to frozen publication content/authority evidence. Unique series/revision, predecessor and one-current constraints protect revision allocation. Serialization conflicts fail closed; refresh and retry review, without auto-publication.

## Operator workflow

Sports Data Hub → Canonical weekly review/export → choose season/week → record reviewed manifest → calculate SHADOW with frozen eligibility → readiness/run review → enter acceptance reason → Accept Canonical Week → Download Canonical Results.

Concrete blocker codes remain visible; acceptance is disabled when evidence or run validation fails. Review displays full positional fields, source/identity changes and rank differences since the latest publication. RankEyeQ must separately validate its exact provider→RankableEntry and DEF crosswalk contract before cross-product acceptance.

## Historical evidence

Week1/2 are not accepted by this implementation. The read-only Preview observations show 398/404 player rows, 32 defenses each, but 580/574 roster players have no weekly stat/participation disposition evidence. Hunter lacks nflcom-bootstrap identity. Independent finality, full-channel population, reviewed consumer crosswalk and frozen weekly eligibility manifest remain required. No historical publication, DNP backfill or identity repair was created.

## Deployment safeguards

The additive migration is applied only to isolated Preview. Current Production Vercel binding remains unverified. No Production code/schema/data operation is authorized, and nothing is committed until product-owner review. No change to factual ingestion, canonical schedules, scoring coefficients, other products, Growth OS or social state is included.

## Reproducible isolated service verification

`scripts/verify-canonical-export.mts` exercises real Prisma services and database constraints against an empty, fully migrated local PostgreSQL fixture database. It rejects targets outside the explicit localhost fixture endpoint. Run with the React server condition and the repository TypeScript loader. Fixtures are synthetic and must never be used as historical canonical evidence. The script checks ACTIVE preservation, authorization, stale review, acceptance idempotency, immutable evidence/bytes, withdrawal, correction revision linkage, affirmative nonparticipant null points/rank and the one-current constraint. Temporary outputs go to ignored `tmp/`. No new runtime dependency is introduced.
