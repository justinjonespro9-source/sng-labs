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
