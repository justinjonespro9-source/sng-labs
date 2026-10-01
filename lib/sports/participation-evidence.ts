import { Prisma, type PrismaClient } from "@prisma/client";
import { manifestSchema } from "./scoring/export-schema";
import { exportChecksum } from "./scoring/export-serialization";
import { loadWeekObservation, type SportsClient } from "./scoring/observation";
import { evaluateWeeklyReadiness, observationFingerprint } from "./scoring/readiness";

export async function requireCanonicalAuthority(db: SportsClient, actorId: string) {
  const actor=await db.user.findUnique({where:{id:actorId}});
  if(!actor || !["OWNER","ADMIN"].includes(actor.role)) throw new Error("Canonical review requires OWNER or ADMIN");
  return actor;
}
/** Records operator attestations. It never synthesizes source evidence, DNP or identifiers. */
export async function reviewWeeklyManifest(db: PrismaClient, raw: unknown, actorId: string, reason: string) {
  if(!reason.trim()) throw new Error("Review reason is required");
  const payload=manifestSchema.parse(raw);
  return db.$transaction(async tx=>{
    await requireCanonicalAuthority(tx,actorId);
    const observed=await loadWeekObservation(tx,payload.season,payload.week);
    const checksum=exportChecksum(payload);
    const prior=await tx.sportsWeeklyCoverageManifest.findUnique({where:{checksum}});
    if(prior) {
      if(prior.observedFingerprint!==observationFingerprint(observed)) throw new Error("Existing manifest review is stale; revise source/evidence attestations before reviewing again");
      return prior;
    }
    const manifest=await tx.sportsWeeklyCoverageManifest.create({data:{league:payload.league,seasonYear:payload.season,week:payload.week,payload:payload as Prisma.InputJsonValue,checksum,observedFingerprint:observationFingerprint(observed),reviewedById:actorId,reason:reason.trim(),participationEvidence:{create:payload.participants.map(p=>({participantId:p.participantId,eventKey:p.eventKey,state:p.state,evidence:p as Prisma.InputJsonValue,checksum:exportChecksum(p)}))}}});
    const readiness=evaluateWeeklyReadiness(observed,payload);
    await tx.auditEvent.create({data:{actorId,action:"SPORTS_CANONICAL_MANIFEST_REVIEWED",entityType:"SportsWeeklyCoverageManifest",entityId:manifest.id,metadata:{checksum,ready:readiness.ready,blockerCount:readiness.blockers.length}}});
    return manifest;
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
}
