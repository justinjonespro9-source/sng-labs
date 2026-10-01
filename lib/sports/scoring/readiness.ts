import { fingerprint } from "./canonical-json";
import { exportChecksum } from "./export-serialization";
import { manifestSchema, POSITIONS, type WeeklyManifest } from "./export-schema";
import { scorableParticipation } from "./weekly-eligibility";
import { NFL_DEFENSE_FACT_FIELDS, NFL_PLAYER_FACT_FIELDS } from "./nfl-adapter";
import { NFL_HALF_PPR_SNG_V1, NFL_HALF_PPR_SNG_V1_CHECKSUM, NFL_SCORING_ENGINE_VERSION } from "./rules";

export type WeekObservation = {
  ruleset: { status: string; code: string; version: number; definition: unknown; definitionChecksum: string; minimumEngineVersion: string } | null;
  events: Array<{ key: string; status: string; homeTeamKey: string; awayTeamKey: string; externalIdentities: unknown }>;
  participants: Array<{ id: string; kind: string; canonicalName: string; identities: Array<{ provider: string; externalId: string; verified: boolean }>; roster: unknown }>;
  players: Array<{ id: string; participantId: string; eventKey: string; finality: string; participationStatus: string; facts: Record<string, unknown>; provenance: unknown }>;
  defenses: Array<{ id: string; participantId: string; eventKey: string; teamKey: string; finality: string; facts: Record<string, unknown>; provenance: unknown }>;
  imports: Array<{ id: string; status: string; type: string; checksum: string; parserVersion: string; payload: unknown; unresolvedCount: number; errorCount: number; records?: Array<{participantId:string|null;eventId:string|null;status:string;normalizedData:unknown}> }>;
  issues: Array<{ id: string; type: string; status: string; summary: string }>;
};
export type Readiness = { ready: boolean; blockers: Array<{ code: string; detail: string }>; checks: Record<string, number>; evidenceChecksum: string; observationFingerprint: string };
export function validateSupportedRuleset(ruleset: WeekObservation["ruleset"], acceptance = false) {
  if (!ruleset || ruleset.code !== NFL_HALF_PPR_SNG_V1.code || ruleset.version !== 1 ||
    ruleset.definitionChecksum !== NFL_HALF_PPR_SNG_V1_CHECKSUM || fingerprint(ruleset.definition) !== NFL_HALF_PPR_SNG_V1_CHECKSUM ||
    ruleset.minimumEngineVersion !== NFL_SCORING_ENGINE_VERSION ||
    !["DRAFT", "SHADOW", "ACTIVE"].includes(ruleset.status) || (acceptance && ruleset.status !== "ACTIVE")) {
    throw new Error("Unsupported or mismatched persisted ruleset/engine contract");
  }
}
export function observationFingerprint(observation: WeekObservation) { return exportChecksum(observation); }
function exact(a: string[], b: string[]) { return new Set(a).size === a.length && new Set(b).size === b.length && [...a].sort().join("\0") === [...b].sort().join("\0"); }
export function evaluateWeeklyReadiness(observation: WeekObservation, rawManifest: unknown, requireActive = true): Readiness {
  const blockers: Readiness["blockers"] = [];
  const block = (code: string, detail: string) => blockers.push({ code, detail });
  const parsed = manifestSchema.safeParse(rawManifest);
  const checks: Record<string,number> = { events: observation.events.length, playerFacts: observation.players.length, defenseFacts: observation.defenses.length, qualityIssues: observation.issues.length };
  if (!parsed.success) {
    block("MANIFEST_REQUIRED", "Reviewed full-week schedule, population, participation, source and weekly-eligibility manifest required");
    block("INDEPENDENT_FINALITY_EVIDENCE", "Stored FINAL status alone is not independent event-finality evidence");
    const absent=observation.participants.filter(p=>p.kind==="PLAYER" && !observation.players.some(s=>s.participantId===p.id));
    checks.absentUnresolved=absent.length;
    if(absent.length) block("ABSENT_UNRESOLVED", `${absent.length} roster/source players lack weekly facts and reviewed participation/disposition evidence; absence is not DNP`);
    for(const p of observation.participants.filter(p=>observation.players.some(s=>s.participantId===p.id))) {
      if(!p.identities.some(i=>i.provider==="nflcom-bootstrap" && i.verified)) block("IDENTITY_MAPPING", `${p.canonicalName} (${p.id}): verified RankEyeQ provider mapping missing`);
    }
    block("FROZEN_WEEKLY_ELIGIBILITY", "Historical team/position and dual-role evidence must be frozen under V1 policy");
    block("PARTICIPATION_CHANNELS", "Reviewed exhaustive offense/defense/special-teams population reconciliation required");
  }
  try { validateSupportedRuleset(observation.ruleset, requireActive); } catch { block("RULESET_CONTRACT", "Persisted definition/status/engine does not match supported V1 authority"); }
  for (const issue of observation.issues) block("QUALITY_ISSUE", `${issue.id}: ${issue.summary}`);
  if (parsed.success) validateManifest(observation, parsed.data, block, checks);
  const ofp = observationFingerprint(observation);
  return { ready: blockers.length === 0, blockers, checks, observationFingerprint: ofp, evidenceChecksum: exportChecksum({ observationFingerprint: ofp, manifest: parsed.success ? parsed.data : null, blockers, checks }) };
}
function validateManifest(o: WeekObservation, m: WeeklyManifest, block: (code:string,detail:string)=>void, checks: Record<string,number>) {
  if (!exact(m.events.map(e=>e.key),o.events.map(e=>e.key))) block("SCHEDULE_SET", "Expected week schedule and canonical event identities differ");
  if (!exact(m.participants.map(p=>p.participantId),o.participants.map(p=>p.id))) block("POPULATION_SET", "Full weekly roster/source participant universe differs from reviewed ledger");
  if (!exact(m.channelsReviewed,["OFFENSE","DEFENSE","SPECIAL_TEAMS"])) block("PARTICIPATION_CHANNELS", "All relevant participation channels must be reviewed");
  for (const event of m.events) {
    const stored = o.events.find(e=>e.key===event.key);
    if (!stored || stored.homeTeamKey!==event.homeTeamKey || stored.awayTeamKey!==event.awayTeamKey) block("EVENT_IDENTITY", event.key);
    if (event.disposition==="PLAYED" && stored?.status!=="FINAL") block("EVENT_FINALITY", `${event.key}: ${stored?.status}`);
    if (event.disposition==="CANCELLED" && stored?.status!=="CANCELLED") block("EVENT_DISPOSITION", `${event.key}: cancellation not established`);
    const players=o.players.filter(p=>p.eventKey===event.key), defenses=o.defenses.filter(p=>p.eventKey===event.key);
    if (event.disposition!=="PLAYED") {
      if (players.length || defenses.length || event.playerParticipantIds.length || event.defenseParticipantIds.length) block("DISPOSITION_WITH_FACTS", event.key);
      continue;
    }
    if (!exact(event.playerParticipantIds,players.map(p=>p.participantId))) block("PLAYER_SET", event.key);
    if (defenses.length!==2 || !exact(event.defenseParticipantIds,defenses.map(p=>p.participantId)) || !exact(defenses.map(d=>d.teamKey),[event.homeTeamKey,event.awayTeamKey])) block("DEFENSE_SET", event.key);
    if (!exact(event.pointsAllowedEvidence.map(p=>p.participantId),defenses.map(d=>d.participantId))) block("POINTS_ALLOWED_EVIDENCE", event.key);
    for(const d of defenses) if(event.pointsAllowedEvidence.find(p=>p.participantId===d.participantId)?.pointsAllowed!==d.facts.pointsAllowed) block("POINTS_ALLOWED_VALUE", d.participantId);
    for(const kind of ["PLAYER","TEAM_DEFENSE"]) {
      const relevant = o.imports.filter(r=>r.status==="APPLIED" && r.unresolvedCount===0 && r.errorCount===0 && (r.payload as {coverage?:{kind?:string;eventRowCounts?:Record<string,number>}})?.coverage?.kind===kind && (r.payload as {coverage:{eventRowCounts:Record<string,number>}}).coverage.eventRowCounts?.[event.key]!==undefined);
      const covered = new Set(relevant.flatMap(r=>((r.payload as {rows?:Array<{eventKey:string;provider?:string;externalId?:string;teamAbbreviation?:string}>}).rows??[]).filter(row=>row.eventKey===event.key).map(row=>kind==="PLAYER"?`${row.provider}:${row.externalId}`:row.teamAbbreviation)));
      if (!relevant.length || !covered.size) block("APPLIED_COVERAGE", `${event.key}: ${kind}`);
      const recordIds=new Set(relevant.flatMap(r=>(r.records??[]).filter(record=>(record.normalizedData as {eventKey?:string})?.eventKey===event.key).map(record=>record.participantId).filter((id):id is string=>Boolean(id))));
      const expectedIds=kind==="PLAYER"?event.playerParticipantIds:event.defenseParticipantIds;
      if(!exact([...recordIds],expectedIds)) block("APPLIED_IDENTITY_SET",`${event.key}: ${kind} resolved ingestion identities differ`);
    }
  }
  for(const row of [...o.players,...o.defenses]) {
    if (!["FINAL","CORRECTED"].includes(row.finality)) block("FACT_FINALITY", row.id);
    const fields="participationStatus" in row?NFL_PLAYER_FACT_FIELDS:NFL_DEFENSE_FACT_FIELDS;
    const nonparticipant = "participationStatus" in row && row.participationStatus === "DID_NOT_PARTICIPATE";
    if(nonparticipant ? fields.some(f=>row.facts[f]!==null) : fields.some(f=>!Number.isSafeInteger(row.facts[f]))) block("FACT_VALUES", row.id);
    const provenance=row.provenance as {ingestionRunId?:string;revisions?:Array<{id:string;reason:string|null}>};
    const imported=o.imports.find(r=>r.id===provenance.ingestionRunId);
    if(!imported || imported.status!=="APPLIED" || imported.unresolvedCount || imported.errorCount) block("FACT_IMPORT",row.id);
    if(row.finality==="CORRECTED" && !provenance.revisions?.some(r=>r.reason?.trim())) block("CORRECTION_EVIDENCE",row.id);
    const ledger=m.participants.find(p=>p.participantId===row.participantId);
    if(!ledger || ledger.eventKey!==row.eventKey || (nonparticipant ? ledger.state!=="VERIFIED_NON_PARTICIPANT" : !scorableParticipation(ledger.state))) block("FACT_LEDGER", row.id);
    if("participationStatus" in row && row.participationStatus!==(ledger?.state==="VERIFIED_NON_PARTICIPANT"?"DID_NOT_PARTICIPATE":ledger?.state)) block("PARTICIPATION_MISMATCH", row.id);
    if("participationStatus" in row && row.participationStatus==="PARTICIPATED_WITH_STATS" && NFL_PLAYER_FACT_FIELDS.every(f=>row.facts[f]===0)) block("FALSE_WITH_STATS",row.id);
    if("participationStatus" in row && row.participationStatus==="PARTICIPATED_ZERO" && NFL_PLAYER_FACT_FIELDS.some(f=>row.facts[f]!==0)) block("FALSE_ZERO",row.id);
  }
  for(const p of m.participants) {
    const current=o.participants.find(x=>x.id===p.participantId);
    if(current?.kind!==p.kind || (p.kind==="TEAM_DEFENSE")!==(p.position==="DEF")) block("PARTICIPANT_KIND",p.participantId);
    if(["UNKNOWN_INCOMPLETE","ABSENT_UNRESOLVED"].includes(p.state)) block("PARTICIPATION_UNRESOLVED",p.participantId);
    if(!p.evidence) block("PARTICIPATION_EVIDENCE",p.participantId);
    if(p.state==="VERIFIED_NON_PARTICIPANT" && p.disposition==="DNP" && !["OFFICIAL_INACTIVE","EXHAUSTIVE_GAME_PARTICIPATION"].includes(p.participationProof)) block("DNP_NOT_AFFIRMED",p.participantId);
    if(p.state==="VERIFIED_NON_PARTICIPANT" && p.disposition!=="DNP" && (p.participationProof!=="WEEK_DISPOSITION" || ["PLAYED","UNRESOLVED"].includes(p.disposition))) block("NONPARTICIPANT_DISPOSITION",p.participantId);
    if(p.disposition==="DNP" && !m.events.some(e=>e.key===p.eventKey && e.disposition==="PLAYED" && [e.homeTeamKey,e.awayTeamKey].includes(p.teamKey))) block("DNP_EVENT",p.participantId);
    if(scorableParticipation(p.state)) {
      if(p.disposition!=="PLAYED" || !["COMPLETE_FACTUAL_LINE","POSITIVE_SNAPS_COMPLETE_FACTS"].includes(p.participationProof)) block("PARTICIPATION_PROOF",p.participantId);
      if(!exact(p.channelsReviewed,["OFFENSE","DEFENSE","SPECIAL_TEAMS"])) block("PARTICIPANT_CHANNELS",p.participantId);
      const facts=p.kind==="PLAYER"?o.players:o.defenses;
      if(facts.filter(f=>f.participantId===p.participantId && f.eventKey===p.eventKey).length!==1) block("SCORABLE_FACT",p.participantId);
      const e=m.events.find(e=>e.key===p.eventKey);
      if(!e || ![e.homeTeamKey,e.awayTeamKey].includes(p.teamKey)) block("WEEK_TEAM",p.participantId);
    }
    if(p.participationProof==="EXHAUSTIVE_GAME_PARTICIPATION" && !exact(p.channelsReviewed,["OFFENSE","DEFENSE","SPECIAL_TEAMS"])) block("DNP_SCOPE",p.participantId);
    if(p.disposition==="BYE" && m.events.some(e=>e.disposition==="PLAYED" && [e.homeTeamKey,e.awayTeamKey].includes(p.teamKey))) block("INVALID_BYE",p.participantId);
    if(p.disposition==="CANCELLED_GAME" && !m.events.some(e=>e.key===p.eventKey && e.disposition==="CANCELLED")) block("INVALID_CANCELLED_DISPOSITION",p.participantId);
    if(p.disposition==="MOVED_OUT_OF_WEEK" && !m.events.some(e=>e.key===p.eventKey && e.disposition==="MOVED_OUT_OF_WEEK")) block("INVALID_MOVED_DISPOSITION",p.participantId);
    const provider=p.kind==="PLAYER"?m.consumerContract.playerProvider:m.consumerContract.defenseProvider;
    const identities=p.identities.filter(i=>i.provider===provider);
    if(identities.length!==1) block("IDENTITY_MAPPING",`${p.participantId}: exact ${provider} mapping required`);
    if(p.kind==="TEAM_DEFENSE" && identities[0]?.externalId!==p.teamKey) block("DEFENSE_CROSSWALK",p.participantId);
    for(const i of p.identities) if(!current?.identities.some(c=>c.verified && c.provider===i.provider && c.externalId===i.externalId)) block("UNVERIFIED_IDENTITY",`${p.participantId}: ${i.provider}:${i.externalId}`);
    const verified=(current?.identities??[]).filter(i=>i.verified).map(i=>`${i.provider}:${i.externalId}`);
    if(!exact(verified,p.identities.map(i=>`${i.provider}:${i.externalId}`))) block("IDENTITY_SET",p.participantId);
  }
  const identityKeys=m.participants.flatMap(p=>p.identities.map(i=>`${i.provider}:${i.externalId}`));
  if(new Set(identityKeys).size!==identityKeys.length) block("DUPLICATE_IDENTITY","External key maps to multiple participants");
  for(const pos of POSITIONS) checks[pos]=m.participants.filter(p=>p.position===pos && scorableParticipation(p.state)).length;
  checks.participatedWithStats=m.participants.filter(p=>p.state==="PARTICIPATED_WITH_STATS").length;
  checks.participatedZero=m.participants.filter(p=>p.state==="PARTICIPATED_ZERO").length;
  checks.nonparticipants=m.participants.filter(p=>p.state==="VERIFIED_NON_PARTICIPANT").length;
  checks.unresolved=m.participants.filter(p=>["UNKNOWN_INCOMPLETE","ABSENT_UNRESOLVED"].includes(p.state)).length;
}
