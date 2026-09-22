# Sports Data factual-stat operations

## V1C.1 source boundary

SNG ingests 2026 weekly player and team summaries, snap counts, and weekly rosters from the versioned `nflverse-data`
GitHub release assets under that repository's CC BY 4.0 license. The importer records
the release URL, timestamp, SHA-256 checksum, parser version, raw canonical payload,
and operator run. Snap counts establish participation, while the weekly roster bridges
PFR snap identities to canonical GSIS player identities. This is an operator-controlled open-data import, not a live product
database dependency and not a website scraper.

The weekly team summary does not define SNG's fantasy D/ST `pointsAllowed` fact.
Operators must supply that field explicitly from reviewed game-level evidence. The
adapter requires one value for each of both defenses in every included completed game
and records that component's label, reference, timestamp, and checksum. It refuses to
prepare an import if any value is absent, duplicated, or outside the requested week.

## Workflow

1. Retain immutable source files and their release metadata.
2. Review explicit D/ST points-allowed facts against the selected source policy.
3. Prepare separate canonical player and D/ST payloads for one completed week.
4. Preview both payloads against the target environment.
5. Review event, participant, team, row-count, finality, and conflict results.
6. Apply only after operator approval; player and D/ST runs remain separately auditable.
7. Replay the identical payloads to verify the existing run is returned without writes.
8. Review Sports Overview, Events, Imports, and Data Quality.

Event coverage is complete only when applied source-completeness assertions exist for
both player and D/ST inputs, stored row counts match those assertions, all source-
reported player rows have an explicit participation state and complete factual values,
and exactly two complete D/ST rows (including explicit `pointsAllowed`) exist. An
all-zero reported player is `PARTICIPATED_ZERO`; unknown or missing participation does
not count as complete. Players absent from a source whose declared scope is only
source-reported fantasy participants are not silently classified as DNP.

## V1C.1 Week 1 Preview acceptance

Accepted on 2026-09-21 after operator review of the complete Preview rehearsal. This
acceptance authorizes V1C.1 documentation and Production-readiness review only; it does
not authorize a Production migration, deployment, factual import, PR merge, Week 2, or
derived fantasy scoring work.

### Accepted coverage and identity results

- 16/16 canonical Week 1 events and 32/32 NFL teams were covered.
- 398 player performance records were resolved: 286 participants with recorded
  statistics and 112 legitimate `PARTICIPATED_ZERO` records.
- Zero player records retained an unknown participation state.
- 398/398 player identities resolved after a Preview-only canonical roster repair for
  Travis Hunter. The repair addressed his dual offensive/defensive role and is not a
  seed, migration, or implicit Production mutation.
- 32/32 D/ST records resolved, including 32/32 operator-reviewed `pointsAllowed`
  values.

### Accepted factual boundary and controls

`pointsAllowed` means the opponent's official final game point total. It is an explicit,
sourced canonical fact and is not derived from other event fields. Any scoring-system
adjustment belongs in a future derived scoring layer, outside the canonical factual
record.

The accepted payloads retained source provenance, finality, component checksums,
aggregate checksums, and parser-version metadata. Explicit-correction controls passed,
as did wrong-team, invalid-event, unresolved-identity, and conflicting-fact rejection.
The nflverse weekly-roster source reference was corrected to
`releases/download/weekly_rosters/roster_weekly_2026.csv`.

Identical player and D/ST replays returned their existing Preview runs. They created no
duplicate factual records and no duplicate import runs. The 398 player facts and 32
D/ST facts remained Preview-only throughout acceptance.

### Acceptance evidence disposition

Generated source snapshots and prepared payloads are local operator evidence under
`tmp/v1c1-week1/`. The repository ignores `tmp/`; these files are not application
artifacts, are not part of PR #20, and must not be deployed or treated as a Production
seed. Retain local evidence as needed for audit, but regenerate or independently verify
Production dry-run inputs before the first Production apply.

## Production closeout runbook

The first Production Week 1 factual apply is a separate authorization boundary. Execute
the following stages in order, stopping on any failed check or unexpected diff:

1. Merge the approved PR only after final branch and required-check verification.
2. Allow the Production deployment to build from the merged commit; do not add an
   implicit migration command to the build.
3. Apply migration `20260920170000_sports_data_hub_v1c1_participation` explicitly to
   the Production database and verify Prisma migration status.
4. Run an authenticated, read-only Command Center smoke test covering Sports Overview,
   Events, Players, DEF/DST, Rosters, Imports, and Data Quality.
5. Prepare independently verified Week 1 player and D/ST payloads, then run Preview-only
   factual imports against Production. Confirm 16 events, 32 teams, 398 players, 112
   `PARTICIPATED_ZERO`, zero unknown/unresolved/blocked rows, 32 defenses, and 32 explicit
   `pointsAllowed` values.
6. Obtain explicit operator approval for the first Production factual apply.
7. Apply the approved player and D/ST runs separately and retain both audit records.
8. Replay both identical payloads and verify the existing runs are returned without
   writes or duplicates.
9. Verify Sports Overview and Data Quality show complete source-declared coverage,
   expected record counts, zero unknown participation, and no new open quality issues.
