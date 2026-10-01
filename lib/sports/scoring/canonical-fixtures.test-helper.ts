import type { CanonicalRun } from "./export";
import { manifestSchema, type WeeklyManifest } from "./export-schema";
import { fingerprint } from "./canonical-json";
import { exportChecksum } from "./export-serialization";
import { competitionRank } from "./competition-rank";
import { NFL_PLAYER_FACT_FIELDS, NFL_DEFENSE_FACT_FIELDS } from "./nfl-adapter";
import { scoreNflPlayer, scoreNflDefense } from "./nfl-engine";
import { NFL_HALF_PPR_SNG_V1, NFL_HALF_PPR_SNG_V1_CHECKSUM, NFL_POSITION_ELIGIBILITY_VERSION, NFL_SCORING_ENGINE_VERSION } from "./rules";
import type { WeekObservation } from "./readiness";

export function canonicalFixture(wrSize=1,negative=false) {
  const evidence={label:"Reviewed test fixture",reference:"fixture://reviewed/1",checksum:"a".repeat(64),observedAt:"2026-09-30T00:00:00.000Z"};
  const ids=["QB","RB","TE",...Array.from({length:wrSize},(_,i)=>`WR${i}`),"DEF-A","DEF-B"];
  const participants=ids.map((id)=>({participantId:id,kind:id.startsWith("DEF")?"TEAM_DEFENSE" as const:"PLAYER" as const,position:(id.startsWith("DEF")?"DEF":id.startsWith("WR")?"WR":id) as "QB"|"RB"|"TE"|"WR"|"DEF",eventKey:"game",teamKey:id==="DEF-B"?"team-b":"team-a",state:id==="QB" && negative?"PARTICIPATED_WITH_STATS" as const:"PARTICIPATED_ZERO" as const,disposition:"PLAYED" as const,participationProof:"COMPLETE_FACTUAL_LINE" as const,channelsReviewed:["OFFENSE","DEFENSE","SPECIAL_TEAMS"] as ("OFFENSE"|"DEFENSE"|"SPECIAL_TEAMS")[],sourcePosition:id,eligibilityEvidence:evidence,evidence,identities:[{provider:id.startsWith("DEF")?"sng-team":"nflcom-bootstrap",externalId:id.startsWith("DEF")?(id==="DEF-A"?"team-a":"team-b"):id,evidence}]}));
  const manifest=manifestSchema.parse({contractVersion:"sng-weekly-coverage-manifest/1",league:"NFL",season:2026,seasonType:"REG",week:1,positionPolicyVersion:NFL_POSITION_ELIGIBILITY_VERSION,scheduleEvidence:evidence,populationEvidence:evidence,scope:"ALL_WEEKLY_ELIGIBLE_SCORABLE_AND_UNRANKED_DISPOSITIONS",channelsReviewed:["OFFENSE","DEFENSE","SPECIAL_TEAMS"],events:[{key:"game",homeTeamKey:"team-a",awayTeamKey:"team-b",disposition:"PLAYED",finalityEvidence:evidence,playerParticipantIds:participants.filter(p=>p.kind==="PLAYER").map(p=>p.participantId),defenseParticipantIds:["DEF-A","DEF-B"],pointsAllowedEvidence:["DEF-A","DEF-B"].map(id=>({participantId:id,pointsAllowed:0,evidence}))}],participants,sources:[evidence],consumerContract:{playerProvider:"nflcom-bootstrap",defenseProvider:"sng-team",evidence}});
  const observation:WeekObservation={ruleset:{status:"ACTIVE",code:"SNG_NFL_HALF_PPR",version:1,definition:NFL_HALF_PPR_SNG_V1,definitionChecksum:NFL_HALF_PPR_SNG_V1_CHECKSUM,minimumEngineVersion:NFL_SCORING_ENGINE_VERSION},events:[{key:"game",status:"FINAL",homeTeamKey:"team-a",awayTeamKey:"team-b",externalIdentities:[]}],participants:participants.map(p=>({id:p.participantId,kind:p.kind,canonicalName:p.participantId,identities:p.identities.map(i=>({...i,verified:true})),roster:[]})),players:[],defenses:[],imports:[],issues:[]};
  const run={id:"run",mode:"SHADOW",status:"COMPLETED",league:"NFL",sport:"FOOTBALL",seasonYear:2026,week:1,rulesetChecksum:NFL_HALF_PPR_SNG_V1_CHECKSUM,engineVersion:NFL_SCORING_ENGINE_VERSION,blockedCount:0,errorCount:0,unresolvedCount:0,expectedInputCount:ids.length,calculatedCount:ids.length,resultSetCount:5,summary:{manifestChecksum:exportChecksum(manifest),fingerprintContract:"FROZEN_WEEKLY_ELIGIBILITY/1"},inputSnapshots:[],derivedPerformances:[],weeklyResultSets:[]} as unknown as CanonicalRun;
  for(const p of participants){
    const facts=Object.fromEntries((p.kind==="PLAYER"?NFL_PLAYER_FACT_FIELDS:NFL_DEFENSE_FACT_FIELDS).map(f=>[f,0]));
    if(negative && p.participantId==="QB") facts.interceptionsThrown=1;
    const normalized=p.kind==="PLAYER"?{participationStatus:p.state,...facts}:facts;
    const sourceId=`stat-${p.participantId}`,revisionFingerprint=fingerprint({id:sourceId,revisionId:null,facts:normalized,finality:"FINAL"});
    const inputChecksum=fingerprint({kind:p.kind,participantId:p.participantId,eventId:"event-id",revisionFingerprint,eligibilityFingerprint:fingerprint(p),facts:normalized});
    const scored=p.kind==="PLAYER"?scoreNflPlayer(normalized as Parameters<typeof scoreNflPlayer>[0]):scoreNflDefense(normalized as Parameters<typeof scoreNflDefense>[0]);
    const snapshot={id:`input-${p.participantId}`,participantId:p.participantId,eventId:"event-id",performanceKind:p.kind,sourceEntityId:sourceId,sourceEntityType:p.kind==="PLAYER"?"NflPlayerEventStat":"NflDefenseEventStat",sourceIngestionRunId:`import-${p.kind}`,sourceRevisionId:null,sourceRevisionFingerprint:revisionFingerprint,sourceFinality:"FINAL",normalizedFacts:normalized,inputChecksum};
    run.inputSnapshots.push(snapshot as typeof run.inputSnapshots[number]);
    run.derivedPerformances.push({id:`derived-${p.participantId}`,inputSnapshotId:snapshot.id,participantId:p.participantId,eventId:"event-id",engineVersion:run.engineVersion,rulesetChecksum:run.rulesetChecksum,pointsHundredths:scored.pointsHundredths,componentBreakdown:scored.components,resultFingerprint:fingerprint({inputChecksum,rulesetChecksum:run.rulesetChecksum,engineVersion:run.engineVersion,pointsHundredths:scored.pointsHundredths,components:scored.components})} as unknown as typeof run.derivedPerformances[number]);
    const base={id:sourceId,participantId:p.participantId,eventKey:"game",finality:"FINAL",facts,provenance:{ingestionRunId:`import-${p.kind}`,revisions:[]}};
    if(p.kind==="PLAYER")observation.players.push({...base,participationStatus:p.state});else observation.defenses.push({...base,teamKey:p.teamKey});
  }
  observation.imports=["PLAYER","TEAM_DEFENSE"].map(kind=>({id:`import-${kind}`,status:"APPLIED",type:kind==="PLAYER"?"PLAYER_EVENT_STATS":"DEFENSE_EVENT_STATS",checksum:"b".repeat(64),parserVersion:"fixture",unresolvedCount:0,errorCount:0,records:participants.filter(p=>p.kind===kind).map(p=>({participantId:p.participantId,eventId:"event-id",status:"CREATE",normalizedData:{eventKey:"game"}})),payload:{coverage:{kind,eventRowCounts:{game:participants.filter(p=>p.kind===kind).length}},rows:participants.filter(p=>p.kind===kind).map(p=>({eventKey:"game",provider:p.identities[0].provider,externalId:p.identities[0].externalId,teamAbbreviation:p.kind==="TEAM_DEFENSE"?p.teamKey:null}))}}));
  run.inputSetChecksum=fingerprint(run.inputSnapshots.map(s=>s.inputChecksum).sort());
  run.runFingerprint=fingerprint({sport:"FOOTBALL",league:"NFL",year:2026,week:1,mode:"SHADOW",rulesetChecksum:run.rulesetChecksum,engineVersion:run.engineVersion,inputSetChecksum:run.inputSetChecksum,eligibilityPolicyVersion:NFL_POSITION_ELIGIBILITY_VERSION,manifestChecksum:exportChecksum(manifest)});
  for(const position of ["QB","RB","WR","TE","DEF"]){
    const rankings=competitionRank(participants.filter(p=>p.position===position).map(p=>({participantId:p.participantId,derivedPerformanceId:`derived-${p.participantId}`,pointsHundredths:run.derivedPerformances.find(d=>d.participantId===p.participantId)!.pointsHundredths})));
    run.weeklyResultSets.push({id:`set-${position}`,positionCode:position,eligibilityPolicyVersion:NFL_POSITION_ELIGIBILITY_VERSION,inputSetChecksum:run.inputSetChecksum,resultSetChecksum:fingerprint({runFingerprint:run.runFingerprint,positionCode:position,rankings}),fieldSize:rankings.length,entries:rankings.map(r=>({...r,positionCode:position,id:`entry-${r.participantId}`}))} as unknown as typeof run.weeklyResultSets[number]);
  }
  return {manifest,observation,run,evidence};
}
export function addNonparticipant(manifest:WeeklyManifest,observation:WeekObservation) {
  const p={...manifest.participants[0],participantId:"DNP",state:"VERIFIED_NON_PARTICIPANT" as const,disposition:"DNP" as const,participationProof:"OFFICIAL_INACTIVE" as const,identities:[{...manifest.participants[0].identities[0],externalId:"DNP"}]};
  manifest.participants.push(p);observation.participants.push({id:p.participantId,kind:p.kind,canonicalName:"DNP",identities:p.identities.map(i=>({...i,verified:true})),roster:[]});
}
