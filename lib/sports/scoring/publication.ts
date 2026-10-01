import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { requireCanonicalAuthority } from "../participation-evidence";
import { buildCanonicalArtifact, verifyCanonicalArtifact } from "./export";
import { exportChecksum } from "./export-serialization";
import { manifestSchema } from "./export-schema";
import { loadWeekObservation } from "./observation";
import { evaluateWeeklyReadiness, observationFingerprint } from "./readiness";

export async function inspectCanonicalReadiness(db: PrismaClient, year: number, week: number, manifestId?: string) {
  const observation=await loadWeekObservation(db,year,week);
  const manifest=manifestId?await db.sportsWeeklyCoverageManifest.findUnique({where:{id:manifestId}}):null;
  const readiness=evaluateWeeklyReadiness(observation,manifest?.payload??null);
  if(manifest && (manifest.seasonYear!==year || manifest.week!==week || manifest.checksum!==exportChecksum(manifest.payload) || manifest.observedFingerprint!==readiness.observationFingerprint)) {
    readiness.blockers.push({code:"STALE_REVIEW",detail:"Manifest no longer matches week/source/identity evidence; create a fresh reviewed manifest"});readiness.ready=false;
  }
  return {observation,manifest,readiness};
}
export async function acceptCanonicalWeek(db: PrismaClient, input: {runId:string;manifestId:string;actorId:string;reason:string;reviewFingerprint:string}) {
  if(!input.reason.trim()) throw new Error("Acceptance reason required");
  return db.$transaction(async tx=>{
    await requireCanonicalAuthority(tx,input.actorId);
    const manifest=await tx.sportsWeeklyCoverageManifest.findUniqueOrThrow({where:{id:input.manifestId}});
    const payload=manifestSchema.parse(manifest.payload);
    const seriesKey=`NFL:REG:${payload.season}:${payload.week}:SNG_NFL_HALF_PPR@1:${payload.positionPolicyVersion}`;
    // Per-series advisory lock + serializable transaction + partial unique index.
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${seriesKey}, 0))`;
    const run=await tx.sportsScoringRun.findUniqueOrThrow({where:{id:input.runId},include:{inputSnapshots:true,derivedPerformances:true,weeklyResultSets:{include:{entries:true}}}});
    const observation=await loadWeekObservation(tx,payload.season,payload.week);
    const observed=observationFingerprint(observation);
    if(manifest.checksum!==exportChecksum(payload) || manifest.observedFingerprint!==observed || input.reviewFingerprint!==observed) throw new Error("Stale review: facts, schedule, identity or eligibility changed");
    const replay=await tx.sportsCanonicalPublication.findFirst({where:{seriesKey,scoringRunId:run.id,manifestId:manifest.id}});
    if(replay){if(replay.state!=="ACCEPTED") throw new Error("Publication is no longer current; a fresh revision requires fresh evidence");return replay;}
    const previous=await tx.sportsCanonicalPublication.findFirst({where:{seriesKey},orderBy:{revision:"desc"}});
    const acceptance={id:randomUUID(),seriesKey,revision:(previous?.revision??0)+1,supersedesId:previous?.id??null,acceptedById:input.actorId,acceptedAt:new Date().toISOString(),reason:input.reason.trim(),manifestChecksum:manifest.checksum};
    const built=buildCanonicalArtifact(run,observation,payload,acceptance);
    verifyCanonicalArtifact(built.bytes);
    if(previous?.state==="ACCEPTED") await tx.sportsCanonicalPublication.update({where:{id:previous.id},data:{state:"SUPERSEDED",authorityChangedAt:new Date(acceptance.acceptedAt),authorityReason:`Superseded by ${acceptance.id}`}});
    const publication=await tx.sportsCanonicalPublication.create({data:{id:acceptance.id,seriesKey,revision:acceptance.revision,scoringRunId:run.id,manifestId:manifest.id,acceptedById:input.actorId,acceptedAt:new Date(acceptance.acceptedAt),reason:acceptance.reason,supersedesId:acceptance.supersedesId,schemaVersion:built.artifact.schemaVersion,canonicalBytes:built.bytes,contentChecksum:built.checksum,readinessChecksum:built.readiness.evidenceChecksum}});
    await tx.auditEvent.create({data:{actorId:input.actorId,action:"SPORTS_CANONICAL_WEEK_ACCEPTED",entityType:"SportsCanonicalPublication",entityId:publication.id,metadata:{seriesKey,revision:publication.revision,checksum:built.checksum,manifestId:manifest.id,runId:run.id}}});
    return publication;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:60000});
}
export async function withdrawCanonicalPublication(db: PrismaClient,id:string,actorId:string,reason:string) {
  if(!reason.trim()) throw new Error("Withdrawal reason required");
  return db.$transaction(async tx=>{
    await requireCanonicalAuthority(tx,actorId);
    const record=await tx.sportsCanonicalPublication.findUniqueOrThrow({where:{id}});
    if(record.state!=="ACCEPTED") throw new Error("Only the current accepted publication can be withdrawn");
    const result=await tx.sportsCanonicalPublication.update({where:{id},data:{state:"WITHDRAWN",authorityChangedAt:new Date(),authorityReason:reason.trim()}});
    await tx.auditEvent.create({data:{actorId,action:"SPORTS_CANONICAL_PUBLICATION_WITHDRAWN",entityType:"SportsCanonicalPublication",entityId:id,metadata:{reason:reason.trim(),checksum:record.contentChecksum}}});
    return result;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
export async function storedCanonicalDownload(db: PrismaClient,id:string) {
  const publication=await db.sportsCanonicalPublication.findUniqueOrThrow({where:{id}});
  verifyCanonicalArtifact(publication.canonicalBytes);
  if(JSON.parse(publication.canonicalBytes).contentChecksum!==publication.contentChecksum) throw new Error("Stored artifact digest mismatch");
  return {bytes:publication.canonicalBytes,checksum:publication.contentChecksum,state:publication.state,filename:`sng-nfl-${publication.id}-r${publication.revision}.json`};
}
