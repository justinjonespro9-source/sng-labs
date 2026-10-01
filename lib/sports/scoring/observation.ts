import type { Prisma, PrismaClient } from "@prisma/client";
import type { WeekObservation } from "./readiness";
import { NFL_DEFENSE_FACT_FIELDS, NFL_PLAYER_FACT_FIELDS } from "./nfl-adapter";

export type SportsClient = PrismaClient | Prisma.TransactionClient;
export async function loadWeekObservation(db: SportsClient, season: number, week: number): Promise<WeekObservation> {
  const eventWhere={league:"NFL",season,week,type:"GAME" as const};
  const [ruleset,events,participants,players,defenses,imports,issues] = await Promise.all([
    db.sportsScoringRuleset.findUnique({where:{code_version:{code:"SNG_NFL_HALF_PPR",version:1}}}),
    db.growthEvent.findMany({where:eventWhere,include:{homeTeam:true,awayTeam:true,externalIdentities:true},orderBy:{key:"asc"}}),
    db.sportsParticipant.findMany({where:{OR:[{rosterMemberships:{some:{season:{league:"NFL",year:season}}}},{playerEventStats:{some:{event:eventWhere}}},{defenseEventStats:{some:{event:eventWhere}}}]},include:{externalIdentities:{orderBy:[{provider:"asc"},{externalId:"asc"}]},rosterMemberships:{where:{season:{league:"NFL",year:season}},include:{team:true},orderBy:{id:"asc"}}},orderBy:{id:"asc"}}),
    db.nflPlayerEventStat.findMany({where:{event:eventWhere},include:{event:true,revisions:{orderBy:{id:"asc"}}},orderBy:{id:"asc"}}),
    db.nflDefenseEventStat.findMany({where:{event:eventWhere},include:{event:true,team:true,revisions:{orderBy:{id:"asc"}}},orderBy:{id:"asc"}}),
    db.sportsIngestionRun.findMany({where:{season:{league:"NFL",year:season},type:{in:["PLAYER_EVENT_STATS","DEFENSE_EVENT_STATS","EVENT_STAT_CORRECTION"]}},include:{records:{orderBy:{rowNumber:"asc"}}},orderBy:{id:"asc"}}),
    // Conservative: all open sports issues, including unscoped ones, block acceptance.
    db.sportsDataQualityIssue.findMany({where:{status:"OPEN"},orderBy:{id:"asc"}}),
  ]);
  const provenance=(row:typeof players[number]|typeof defenses[number])=>({ingestionRunId:row.ingestionRunId,sourceLabel:row.sourceLabel,sourceReference:row.sourceReference,sourceType:row.sourceType,sourceTimestamp:row.sourceTimestamp?.toISOString()??null,revisions:row.revisions.map(r=>({id:r.id,previousValues:r.previousValues,newValues:r.newValues,reason:r.reason,ingestionRunId:r.ingestionRunId}))});
  return {
    ruleset:ruleset?{status:ruleset.status,code:ruleset.code,version:ruleset.version,definition:ruleset.definition,definitionChecksum:ruleset.definitionChecksum,minimumEngineVersion:ruleset.minimumEngineVersion}:null,
    events:events.map(e=>({key:e.key??e.id,status:e.status,homeTeamKey:e.homeTeam?.key??"",awayTeamKey:e.awayTeam?.key??"",externalIdentities:e.externalIdentities.map(i=>({provider:i.provider,externalId:i.externalId}))})),
    participants:participants.map(p=>({id:p.id,kind:p.kind,canonicalName:p.canonicalName,identities:p.externalIdentities.map(i=>({provider:i.provider,externalId:i.externalId,verified:i.verifiedAt!==null})),roster:p.rosterMemberships.map(m=>({id:m.id,teamKey:m.team.key,position:m.fantasyPosition,sourcePosition:m.sourcePosition,active:m.active,status:m.status}))})),
    players:players.map(p=>({id:p.id,participantId:p.participantId,eventKey:p.event.key??p.eventId,finality:p.finality,participationStatus:p.participationStatus,facts:Object.fromEntries(NFL_PLAYER_FACT_FIELDS.map(f=>[f,p[f]])),provenance:provenance(p)})),
    defenses:defenses.map(p=>({id:p.id,participantId:p.participantId,eventKey:p.event.key??p.eventId,teamKey:p.team.key,finality:p.finality,facts:Object.fromEntries(NFL_DEFENSE_FACT_FIELDS.map(f=>[f,p[f]])),provenance:provenance(p)})),
    imports:imports.map(r=>({id:r.id,status:r.status,type:r.type,checksum:r.checksum,parserVersion:r.parserVersion,payload:JSON.parse(r.rawPayload),unresolvedCount:r.unresolvedCount,errorCount:r.errorCount,records:r.records.map(record=>({participantId:record.participantId,eventId:record.eventId,status:record.status,normalizedData:record.normalizedData}))})),
    issues:issues.map(i=>({id:i.id,type:i.type,status:i.status,summary:i.summary})),
  };
}
