import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { fingerprint } from "./canonical-json";
import { competitionRank } from "./competition-rank";
import { ARTIFACT_SCHEMA_VERSION, checksumSchema, manifestSchema, POSITIONS } from "./export-schema";
import { canonicalExportJson, exportChecksum, SERIALIZATION_VERSION } from "./export-serialization";
import { adaptNflDefenseFacts, adaptNflPlayerFacts } from "./nfl-adapter";
import { scoreNflDefense, scoreNflPlayer } from "./nfl-engine";
import { evaluateWeeklyReadiness, type WeekObservation } from "./readiness";
import { scorableParticipation } from "./weekly-eligibility";
import { NFL_HALF_PPR_SNG_V1_CHECKSUM, NFL_POSITION_ELIGIBILITY_VERSION, NFL_SCORING_ENGINE_VERSION } from "./rules";

export type CanonicalRun = Prisma.SportsScoringRunGetPayload<{include:{inputSnapshots:true;derivedPerformances:true;weeklyResultSets:{include:{entries:true}}}}>;
export function validateCanonicalRun(run: CanonicalRun, observation: WeekObservation, rawManifest: unknown) {
  const manifest=manifestSchema.parse(rawManifest);
  if(run.status!=="COMPLETED" || run.mode!=="SHADOW" || run.league!=="NFL" || run.seasonYear!==manifest.season || run.week!==manifest.week || run.engineVersion!==NFL_SCORING_ENGINE_VERSION || run.rulesetChecksum!==NFL_HALF_PPR_SNG_V1_CHECKSUM) throw new Error("Canonical acceptance requires a supported COMPLETED SHADOW run for this week");
  const scorable=manifest.participants.filter(p=>scorableParticipation(p.state));
  if(run.inputSnapshots.length!==scorable.length || run.derivedPerformances.length!==scorable.length || run.calculatedCount!==scorable.length || run.expectedInputCount!==scorable.length || run.blockedCount || run.unresolvedCount || run.errorCount) throw new Error("Run is not the complete scorable population");
  const summary=run.summary as {manifestChecksum?:string;fingerprintContract?:string}|null;
  const frozen=summary?.fingerprintContract==="FROZEN_WEEKLY_ELIGIBILITY/1";
  if(!frozen || summary?.manifestChecksum!==exportChecksum(manifest)) throw new Error("Run lacks reviewed frozen weekly eligibility; recalculate under manifest");
  for(const snapshot of run.inputSnapshots) {
    const p=scorable.find(p=>p.participantId===snapshot.participantId);
    const source=(snapshot.performanceKind==="PLAYER"?observation.players:observation.defenses).find(s=>s.id===snapshot.sourceEntityId);
    const facts=source ? {...source.facts,...("participationStatus" in source?{participationStatus:source.participationStatus}:{})}:null;
    const provenance=source?.provenance as {ingestionRunId:string;revisions:Array<{id:string}>}|undefined;
    if(!p || !source || source.eventKey!==p.eventKey || source.finality!==snapshot.sourceFinality || provenance?.ingestionRunId!==snapshot.sourceIngestionRunId || canonicalExportJson(facts)!==canonicalExportJson(snapshot.normalizedFacts)) throw new Error("Run snapshot is stale or outside reviewed event population");
    if(snapshot.sourceRevisionId && !provenance?.revisions.some(r=>r.id===snapshot.sourceRevisionId)) throw new Error("Source revision missing");
    const revisionFingerprint=fingerprint({id:source.id,revisionId:snapshot.sourceRevisionId,facts,finality:source.finality});
    if(revisionFingerprint!==snapshot.sourceRevisionFingerprint) throw new Error("Source revision fingerprint mismatch");
    const checksum=fingerprint({kind:snapshot.performanceKind,participantId:snapshot.participantId,eventId:snapshot.eventId,revisionFingerprint,eligibilityFingerprint:fingerprint(p),facts:snapshot.normalizedFacts});
    if(checksum!==snapshot.inputChecksum) throw new Error("Input checksum mismatch");
    const scored=snapshot.performanceKind==="PLAYER"?scoreNflPlayer(adaptNflPlayerFacts(snapshot.normalizedFacts as Record<string,unknown>)):scoreNflDefense(adaptNflDefenseFacts(snapshot.normalizedFacts as Record<string,unknown>));
    const performance=run.derivedPerformances.find(d=>d.inputSnapshotId===snapshot.id);
    if(!performance || performance.participantId!==p.participantId || performance.eventId!==snapshot.eventId || performance.engineVersion!==run.engineVersion || performance.rulesetChecksum!==run.rulesetChecksum || performance.pointsHundredths!==scored.pointsHundredths || fingerprint(performance.componentBreakdown)!==fingerprint(scored.components) || performance.resultFingerprint!==fingerprint({inputChecksum:checksum,rulesetChecksum:run.rulesetChecksum,engineVersion:run.engineVersion,pointsHundredths:scored.pointsHundredths,components:scored.components})) throw new Error("Derived performance invariant failed");
  }
  const inputSetChecksum=fingerprint(run.inputSnapshots.map(s=>s.inputChecksum).sort());
  if(inputSetChecksum!==run.inputSetChecksum || run.runFingerprint!==fingerprint({sport:"FOOTBALL",league:"NFL",year:run.seasonYear,week:run.week,mode:run.mode,rulesetChecksum:run.rulesetChecksum,engineVersion:run.engineVersion,inputSetChecksum,eligibilityPolicyVersion:NFL_POSITION_ELIGIBILITY_VERSION,manifestChecksum:summary.manifestChecksum})) throw new Error("Run fingerprint invariant failed");
  if(run.weeklyResultSets.length!==5 || new Set(run.weeklyResultSets.map(s=>s.positionCode)).size!==5) throw new Error("Five complete positional fields required");
  for(const position of POSITIONS) {
    const set=run.weeklyResultSets.find(s=>s.positionCode===position);
    const expected=scorable.filter(p=>p.position===position).map(p=>{
      const d=run.derivedPerformances.find(d=>d.participantId===p.participantId)!;
      return {participantId:p.participantId,derivedPerformanceId:d.id,pointsHundredths:d.pointsHundredths};
    });
    const rankings=competitionRank(expected);
    if(!set || set.eligibilityPolicyVersion!==NFL_POSITION_ELIGIBILITY_VERSION || set.inputSetChecksum!==run.inputSetChecksum || set.fieldSize!==rankings.length || set.entries.length!==rankings.length || set.resultSetChecksum!==fingerprint({runFingerprint:run.runFingerprint,positionCode:position,rankings})) throw new Error(`${position} population/checksum invariant failed`);
    for(const rank of rankings) {
      const entry=set.entries.find(e=>e.participantId===rank.participantId);
      if(!entry || entry.positionCode!==position || entry.derivedPerformanceId!==rank.derivedPerformanceId || entry.pointsHundredths!==rank.pointsHundredths || entry.competitionRank!==rank.competitionRank || entry.tieGroupKey!==rank.tieGroupKey || entry.tieGroupSize!==rank.tieGroupSize || entry.displayOrdinal!==rank.displayOrdinal || entry.fieldSize!==rank.fieldSize || entry.isTop3!==rank.isTop3 || entry.isTop10!==rank.isTop10 || entry.isTop15!==rank.isTop15) throw new Error(`${position} rank/tie invariant failed`);
    }
  }
}
export function buildCanonicalArtifact(run: CanonicalRun, observation: WeekObservation, rawManifest: unknown, acceptance: {id:string;seriesKey:string;revision:number;supersedesId:string|null;acceptedById:string;acceptedAt:string;reason:string;manifestChecksum:string}) {
  const manifest=manifestSchema.parse(rawManifest),readiness=evaluateWeeklyReadiness(observation,manifest);
  if(!readiness.ready) throw new Error(readiness.blockers.map(b=>`${b.code}: ${b.detail}`).join("; "));
  validateCanonicalRun(run,observation,manifest);
  const resultSets=POSITIONS.map(position=>{
    const set=run.weeklyResultSets.find(s=>s.positionCode===position)!;
    const entries=[...set.entries].sort((a,b)=>a.displayOrdinal-b.displayOrdinal).map(e=>{
      const p=manifest.participants.find(p=>p.participantId===e.participantId)!;
      const identity=observation.participants.find(p=>p.id===e.participantId)!;
      const d=run.derivedPerformances.find(d=>d.id===e.derivedPerformanceId)!;
      const input=run.inputSnapshots.find(s=>s.id===d.inputSnapshotId)!;
      const event=manifest.events.find(x=>x.key===p.eventKey)!;
      const source=(p.kind==="PLAYER"?observation.players:observation.defenses).find(s=>s.id===input.sourceEntityId)!;
      return {resultKey:`${position}:${p.participantId}`,participantId:p.participantId,participantKind:p.kind,canonicalName:identity.canonicalName,externalIdentities:p.identities,canonicalPosition:position,teamKey:p.teamKey,eventKey:p.eventKey,opponentTeamKey:event.homeTeamKey===p.teamKey?event.awayTeamKey:event.homeTeamKey,participationState:p.state,sourceFinality:input.sourceFinality,pointsHundredths:e.pointsHundredths,competitionRank:e.competitionRank,tieGroupKey:e.tieGroupKey,tieGroupSize:e.tieGroupSize,displayOrdinal:e.displayOrdinal,derivedPerformanceId:d.id,resultFingerprint:d.resultFingerprint,inputSnapshotId:input.id,inputChecksum:input.inputChecksum,sourceRevisionFingerprint:input.sourceRevisionFingerprint,eligibilityEvidence:p,performanceEvidence:{eventId:input.eventId,normalizedFacts:input.normalizedFacts,components:d.componentBreakdown,sourceEntityType:input.sourceEntityType,sourceEntityId:input.sourceEntityId,sourceRevisionId:input.sourceRevisionId,sourceIngestionRunId:input.sourceIngestionRunId,provenance:source.provenance,...(p.kind==="TEAM_DEFENSE"?{pointsAllowedPolicy:"OPPONENT_OFFICIAL_FINAL_GAME_TOTAL",pointsAllowedEvidence:event.pointsAllowedEvidence.find(x=>x.participantId===p.participantId)!}:{})}};
    });
    return {resultSetId:set.id,positionCode:position,eligibilityPolicyVersion:set.eligibilityPolicyVersion,resultSetChecksum:set.resultSetChecksum,exportedRowsChecksum:exportChecksum(entries),fieldSize:set.fieldSize,finality:"FINAL",sourceComplete:true,readinessEvidenceChecksum:readiness.evidenceChecksum,entries};
  });
  const body={schemaVersion:ARTIFACT_SCHEMA_VERSION,serializationVersion:SERIALIZATION_VERSION,artifactId:acceptance.id,seriesKey:acceptance.seriesKey,revision:acceptance.revision,supersedesArtifactId:acceptance.supersedesId,generatedAt:acceptance.acceptedAt,contentChecksumAlgorithm:"SHA-256",payload:{week:{league:"NFL",season:manifest.season,seasonType:manifest.seasonType,week:manifest.week},ruleset:observation.ruleset,engine:{version:run.engineVersion,positionPolicyVersion:manifest.positionPolicyVersion},run:{scoringRunId:run.id,mode:run.mode,status:run.status,runFingerprint:run.runFingerprint,inputSetChecksum:run.inputSetChecksum,sourceRevisionFingerprint:exportChecksum(run.inputSnapshots.map(s=>({id:s.id,fingerprint:s.sourceRevisionFingerprint})).sort((a,b)=>a.id<b.id?-1:1))},acceptance:{...acceptance,status:"ACCEPTED",readinessPolicyVersion:"sng-full-week-readiness/1",readinessEvidenceChecksum:readiness.evidenceChecksum},coverage:{manifest,readiness},events:observation.events,sources:observation.imports,participationLedger:[...manifest.participants].sort((a,b)=>a.participantId<b.participantId?-1:a.participantId>b.participantId?1:0).map(p=>({...p,pointsHundredths:scorableParticipation(p.state)?run.derivedPerformances.find(d=>d.participantId===p.participantId)!.pointsHundredths:null,competitionRank:scorableParticipation(p.state)?resultSets.find(s=>s.positionCode===p.position)!.entries.find(e=>e.participantId===p.participantId)!.competitionRank:null})),resultSets}};
  const artifact={...body,contentChecksum:exportChecksum(body)};
  return {artifact,bytes:canonicalExportJson(artifact),checksum:artifact.contentChecksum,readiness};
}
export type CanonicalArtifact = ReturnType<typeof buildCanonicalArtifact>["artifact"];
const envelopeSchema=z.object({schemaVersion:z.literal(ARTIFACT_SCHEMA_VERSION),serializationVersion:z.literal(SERIALIZATION_VERSION),artifactId:z.string().min(1),seriesKey:z.string().min(1),revision:z.number().int().positive(),supersedesArtifactId:z.string().nullable(),generatedAt:z.iso.datetime(),contentChecksumAlgorithm:z.literal("SHA-256"),contentChecksum:checksumSchema,payload:z.object({week:z.object({league:z.literal("NFL"),season:z.number().int(),seasonType:z.literal("REG"),week:z.number().int()}),ruleset:z.unknown(),engine:z.unknown(),run:z.unknown(),acceptance:z.unknown(),coverage:z.unknown(),events:z.array(z.unknown()),sources:z.array(z.unknown()),participationLedger:z.array(z.unknown()),resultSets:z.array(z.unknown()).length(5)})});
export function verifyCanonicalArtifact(bytes: string): CanonicalArtifact {
  const raw=JSON.parse(bytes);envelopeSchema.parse(raw);
  const a=raw as CanonicalArtifact;const {contentChecksum,...body}=a;
  if(exportChecksum(body)!==contentChecksum || canonicalExportJson(a)!==bytes) throw new Error("Canonical artifact checksum/serialization mismatch");
  if(a.payload.acceptance.status!=="ACCEPTED" || !a.payload.coverage.readiness.ready || a.payload.coverage.readiness.blockers.length) throw new Error("Artifact is not accepted/ready");
  const manifest=manifestSchema.parse(a.payload.coverage.manifest);
  if(a.payload.ruleset?.status!=="ACTIVE" || a.payload.ruleset.definitionChecksum!==NFL_HALF_PPR_SNG_V1_CHECKSUM || fingerprint(a.payload.ruleset.definition)!==NFL_HALF_PPR_SNG_V1_CHECKSUM || a.payload.engine.version!==NFL_SCORING_ENGINE_VERSION || a.payload.engine.positionPolicyVersion!==NFL_POSITION_ELIGIBILITY_VERSION) throw new Error("Artifact authority contract mismatch");
  if(new Set(a.payload.resultSets.map(s=>s.positionCode)).size!==5 || !POSITIONS.every(p=>a.payload.resultSets.some(s=>s.positionCode===p))) throw new Error("Incomplete positional fields");
  const inputChecksums:string[]=[],sourceRevisions:Array<{id:string;fingerprint:string}>=[];
  if(a.payload.week.season!==manifest.season || a.payload.week.week!==manifest.week || a.payload.acceptance.manifestChecksum!==exportChecksum(manifest) || a.payload.acceptance.id!==a.artifactId || a.payload.acceptance.revision!==a.revision || a.payload.run.mode!=="SHADOW" || a.payload.run.status!=="COMPLETED") throw new Error("Artifact week/acceptance/run identity mismatch");
  if(a.payload.participationLedger.length!==manifest.participants.length || new Set(a.payload.participationLedger.map(p=>p.participantId)).size!==manifest.participants.length) throw new Error("Artifact participation ledger incomplete");
  for(const p of a.payload.participationLedger) {
    const m=manifest.participants.find(x=>x.participantId===p.participantId);
    const {pointsHundredths,competitionRank,...proof}=p;
    if(!m || canonicalExportJson(proof)!==canonicalExportJson(m) || ["UNKNOWN_INCOMPLETE","ABSENT_UNRESOLVED"].includes(p.state) || (!scorableParticipation(p.state) && (pointsHundredths!==null || competitionRank!==null))) throw new Error("Artifact participation/disposition invariant failed");
  }
  for(const set of a.payload.resultSets) {
    if(exportChecksum(set.entries)!==set.exportedRowsChecksum || set.fieldSize!==set.entries.length || set.finality!=="FINAL" || !set.sourceComplete) throw new Error("Artifact field invariant failed");
    const expected=manifest.participants.filter(p=>p.position===set.positionCode && scorableParticipation(p.state));
    if(expected.length!==set.entries.length || new Set(set.entries.map(e=>e.participantId)).size!==expected.length || expected.some(p=>!set.entries.some(e=>e.participantId===p.participantId))) throw new Error("Artifact population invariant failed");
    const rankings=competitionRank(set.entries.map(e=>({participantId:e.participantId,derivedPerformanceId:e.derivedPerformanceId,pointsHundredths:e.pointsHundredths})));
    if(set.resultSetChecksum!==fingerprint({runFingerprint:a.payload.run.runFingerprint,positionCode:set.positionCode,rankings})) throw new Error("Artifact stored result-set checksum mismatch");
    for(const e of set.entries) {
      const proof=manifest.participants.find(p=>p.participantId===e.participantId)!;
      if(canonicalExportJson(e.eligibilityEvidence)!==canonicalExportJson(proof) || canonicalExportJson(e.externalIdentities)!==canonicalExportJson(proof.identities) || e.canonicalPosition!==proof.position || e.teamKey!==proof.teamKey || e.eventKey!==proof.eventKey || e.participantKind!==proof.kind || e.participationState!==proof.state || !["FINAL","CORRECTED"].includes(e.sourceFinality)) throw new Error("Artifact identity/eligibility mismatch");
      const revisionFingerprint=fingerprint({id:e.performanceEvidence.sourceEntityId,revisionId:e.performanceEvidence.sourceRevisionId,facts:e.performanceEvidence.normalizedFacts,finality:e.sourceFinality});
      const inputChecksum=fingerprint({kind:e.participantKind,participantId:e.participantId,eventId:e.performanceEvidence.eventId,revisionFingerprint,eligibilityFingerprint:fingerprint(proof),facts:e.performanceEvidence.normalizedFacts});
      if(e.sourceRevisionFingerprint!==revisionFingerprint || e.inputChecksum!==inputChecksum) throw new Error("Artifact source/input fingerprint mismatch");
      inputChecksums.push(inputChecksum);sourceRevisions.push({id:e.inputSnapshotId,fingerprint:revisionFingerprint});
      const r=rankings.find(r=>r.participantId===e.participantId)!;
      if(e.competitionRank!==r.competitionRank || e.tieGroupSize!==r.tieGroupSize || e.tieGroupKey!==r.tieGroupKey || e.displayOrdinal!==r.displayOrdinal || !Number.isSafeInteger(e.pointsHundredths)) throw new Error("Artifact rank/tie invariant failed");
      const scored=e.participantKind==="PLAYER"?scoreNflPlayer(adaptNflPlayerFacts(e.performanceEvidence.normalizedFacts as Record<string,unknown>)):scoreNflDefense(adaptNflDefenseFacts(e.performanceEvidence.normalizedFacts as Record<string,unknown>));
      if(scored.pointsHundredths!==e.pointsHundredths || fingerprint(scored.components)!==fingerprint(e.performanceEvidence.components) || e.resultFingerprint!==fingerprint({inputChecksum,rulesetChecksum:NFL_HALF_PPR_SNG_V1_CHECKSUM,engineVersion:NFL_SCORING_ENGINE_VERSION,pointsHundredths:scored.pointsHundredths,components:scored.components})) throw new Error("Artifact performance invariant failed");
    }
  }
  const inputSetChecksum=fingerprint(inputChecksums.sort());
  if(a.payload.run.inputSetChecksum!==inputSetChecksum || a.payload.run.runFingerprint!==fingerprint({sport:"FOOTBALL",league:"NFL",year:manifest.season,week:manifest.week,mode:"SHADOW",rulesetChecksum:NFL_HALF_PPR_SNG_V1_CHECKSUM,engineVersion:NFL_SCORING_ENGINE_VERSION,inputSetChecksum,eligibilityPolicyVersion:NFL_POSITION_ELIGIBILITY_VERSION,manifestChecksum:exportChecksum(manifest)}) || a.payload.run.sourceRevisionFingerprint!==exportChecksum(sourceRevisions.sort((x,y)=>x.id<y.id?-1:1))) throw new Error("Artifact run/source aggregate invariant failed");
  return a;
}
