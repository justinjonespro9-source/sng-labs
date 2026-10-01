import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/command-center/page-header";
import { inspectCanonicalReadiness } from "@/lib/sports/scoring/publication";
import { reviewCanonicalManifest, calculateCanonicalShadow, acceptCanonicalPublication, withdrawCanonicalWeek } from "@/lib/sports/scoring/operator-actions";
import { validateCanonicalRun } from "@/lib/sports/scoring/export";
import { NFL_POSITION_ELIGIBILITY_VERSION, NFL_SCORING_ENGINE_VERSION } from "@/lib/sports/scoring/rules";

export default async function CanonicalWeekPage({searchParams}:{searchParams:Promise<{year?:string;week?:string;manifest?:string;message?:string}>}) {
  const user=await requireCommandCenterUser(),params=await searchParams;
  const year=Number(params.year??2026),week=Number(params.week??1);
  if(!Number.isInteger(year)||year<2000||year>2100||!Number.isInteger(week)||week<1||week>18) return <p>Choose a valid NFL season and week.</p>;
  const [manifests,runs,publications,previous]=await Promise.all([
    prisma.sportsWeeklyCoverageManifest.findMany({where:{league:"NFL",seasonYear:year,week},orderBy:{reviewedAt:"desc"},take:20}),
    prisma.sportsScoringRun.findMany({where:{league:"NFL",seasonYear:year,week},orderBy:{createdAt:"desc"},include:{inputSnapshots:true,derivedPerformances:true,weeklyResultSets:{include:{entries:true}}}}),
    prisma.sportsCanonicalPublication.findMany({where:{scoringRun:{league:"NFL",seasonYear:year,week}},orderBy:{revision:"desc"},select:{id:true,state:true,revision:true,acceptedAt:true,contentChecksum:true,manifestId:true,scoringRunId:true,reason:true,supersedesId:true}}),
    prisma.sportsCanonicalPublication.findFirst({where:{scoringRun:{league:"NFL",seasonYear:year,week}},orderBy:{revision:"desc"},select:{revision:true,canonicalBytes:true}}),
  ]);
  const selected=manifests.find(m=>m.id===params.manifest)??manifests[0];
  const {observation,readiness}=await inspectCanonicalReadiness(prisma,year,week,selected?.id);
  const priorArtifact=previous ? JSON.parse(previous.canonicalBytes) as import("@/lib/sports/scoring/export").CanonicalArtifact : null;
  const candidate=runs.find(run=>(run.summary as {manifestChecksum?:string}|null)?.manifestChecksum===selected?.checksum);
  const rankChanges=priorArtifact && candidate ? candidate.weeklyResultSets.flatMap(set=>set.entries.flatMap(entry=>{
    const before=priorArtifact.payload.resultSets.find(s=>s.positionCode===set.positionCode)?.entries.find(e=>e.participantId===entry.participantId);
    return !before || before.pointsHundredths!==entry.pointsHundredths || before.competitionRank!==entry.competitionRank ? [{participantId:entry.participantId,position:set.positionCode,previousPointsHundredths:before?.pointsHundredths??null,pointsHundredths:entry.pointsHundredths,previousRank:before?.competitionRank??null,rank:entry.competitionRank}] : [];
  })) : [];
  const authority=["OWNER","ADMIN"].includes(user.role);
  const hidden=<><input type="hidden" name="year" value={year}/><input type="hidden" name="week" value={week}/></>;
  const control="rounded-lg border border-white/15 bg-black/20 p-2 text-white";
  return <div><PageHeader title={`NFL ${year} · Week ${week} Canonical Results`} description="Review the complete week, accept its canonical authority, and download an immutable artifact."/>
    <Link href="/command-center/sports?view=scoring" className="text-sm text-[#b8d4c8]">← Sports Data Hub</Link>
    <form className="mt-5 flex flex-wrap items-end gap-3"><label>Season<input aria-label="Season" className={`${control} block w-28`} name="year" defaultValue={year}/></label><label>Week<input aria-label="Week" className={`${control} block w-24`} name="week" defaultValue={week}/></label><button className={control}>Review week</button></form>
    {params.message&&<p role="alert" className="mt-5 rounded-xl border border-amber-400/30 p-4 text-amber-200">{params.message}</p>}
    <section className="mt-6 rounded-2xl border border-white/10 bg-[#101214] p-6"><h2 className="text-xl text-white">{readiness.ready?"Evidence ready for run validation":"Acceptance blocked"}</h2><p className="mt-2 text-xs text-[#b8d4c8]">SNG_NFL_HALF_PPR@1 · {observation.ruleset?.status??"Missing ruleset"} · {NFL_SCORING_ENGINE_VERSION} · {NFL_POSITION_ELIGIBILITY_VERSION}</p>
      <div className="mt-4 flex flex-wrap gap-4">{Object.entries(readiness.checks).map(([k,v])=><span key={k} className="rounded-lg border border-white/10 p-3 text-sm">{k}: {v}</span>)}</div>
      <p className="mt-4 break-all text-xs">Source / identity fingerprint: {readiness.observationFingerprint}</p><p className="break-all text-xs">Readiness checksum: {readiness.evidenceChecksum}</p>
      <ul className="mt-4 space-y-2">{readiness.blockers.map((b,i)=><li key={`${b.code}-${i}`} className="text-sm text-amber-200"><strong>{b.code}</strong> — {b.detail}</li>)}</ul>
      <p className="mt-4 text-sm text-[#8f9391]">Missing rows remain unknown. Nonparticipation needs affirmative reviewed evidence and stays unranked.</p>
      <details className="mt-4"><summary>Event, participation, D/ST and identity evidence</summary><pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify({events:observation.events,participants:observation.participants.map(p=>({id:p.id,name:p.canonicalName,identities:p.identities})),defenses:observation.defenses,qualityIssues:observation.issues},null,2)}</pre></details>
    </section>
    {priorArtifact&&<section className="mt-6 rounded-2xl border border-white/10 p-6"><h2 className="text-xl text-white">Changes since revision {previous!.revision}</h2><p className="mt-2 text-sm">Source / identity evidence {priorArtifact.payload.coverage.readiness.observationFingerprint===readiness.observationFingerprint?"matches":"changed"} · Reviewed manifest {priorArtifact.payload.acceptance.manifestChecksum===selected?.checksum?"matches":"changed or missing"}</p><p className="mt-2 text-sm">Changed or added scored entries: {candidate?rankChanges.length:"Recalculate with reviewed evidence to compare ranks"}</p><details className="mt-3"><summary>Performance / rank differences</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(rankChanges,null,2)}</pre></details></section>}
    <section className="mt-6 rounded-2xl border border-white/10 p-6"><h2 className="text-xl text-white">Reviewed weekly evidence</h2><p className="mt-2 text-sm text-[#8f9391]">Supply the versioned full-week manifest after reviewing schedule, population, finality, all participation channels and exact identities. The contract is in the canonical export runbook.</p>
      <div className="mt-3 space-y-2">{manifests.map(m=><Link key={m.id} className="block break-all text-xs text-[#b8d4c8]" href={`?year=${year}&week=${week}&manifest=${m.id}`}>{m.reviewedAt.toISOString()} · {m.checksum}</Link>)}</div>
      {selected&&<details className="mt-3"><summary>Selected manifest · {selected.id}</summary><pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(selected.payload,null,2)}</pre></details>}
      {authority&&<form action={reviewCanonicalManifest} className="mt-4 space-y-3">{hidden}<label className="block">Manifest JSON<textarea required name="manifest" className={`${control} mt-2 block min-h-48 w-full`} /></label><label className="block">Review reason<input required name="reason" className={`${control} mt-2 block w-full`}/></label><button className={control}>Record reviewed evidence</button></form>}
      {authority&&selected&&<form action={calculateCanonicalShadow} className="mt-4">{hidden}<input type="hidden" name="manifestId" value={selected.id}/><button className={control}>Calculate SHADOW with frozen eligibility</button></form>}
    </section>
    <section className="mt-6 space-y-4"><h2 className="text-xl text-white">Calculation review</h2>{runs.map(run=>{
      let blocker:string|undefined;
      try{if(!selected) throw new Error("Reviewed manifest required");validateCanonicalRun(run,observation,selected.payload);}catch(e){blocker=e instanceof Error?e.message:"Run not ready";}
      return <article key={run.id} className="rounded-xl border border-white/10 p-5"><h3 className="text-white">{run.id} · {run.mode} / {run.status}</h3><p className="mt-2 break-all text-xs">Run fingerprint: {run.runFingerprint}</p><p className="break-all text-xs">Input checksum: {run.inputSetChecksum}</p>
        {run.weeklyResultSets.map(set=><details className="mt-3" key={set.id}><summary>{set.positionCode} · {set.fieldSize} entries · {set.resultSetChecksum}</summary><div className="mt-2 max-h-80 overflow-auto text-xs">{[...set.entries].sort((a,b)=>a.displayOrdinal-b.displayOrdinal).map(e=><p key={e.id}>#{e.competitionRank} · {observation.participants.find(p=>p.id===e.participantId)?.canonicalName??e.participantId} · {(e.pointsHundredths/100).toFixed(2)} FP · tie {e.tieGroupSize}</p>)}</div></details>)}
        {blocker&&<p className="mt-3 text-sm text-amber-200">{blocker}</p>}
        {authority&&selected&&<form action={acceptCanonicalPublication} className="mt-4 flex flex-wrap gap-3">{hidden}<input type="hidden" name="runId" value={run.id}/><input type="hidden" name="manifestId" value={selected.id}/><input type="hidden" name="reviewFingerprint" value={readiness.observationFingerprint}/><label>Acceptance reason<input required name="reason" className={`${control} ml-2`}/></label><button disabled={!readiness.ready||Boolean(blocker)} className={`${control} disabled:opacity-40`}>Accept Canonical Week</button></form>}
      </article>;
    })}</section>
    <section className="mt-6 space-y-3"><h2 className="text-xl text-white">Canonical publication history</h2>{publications.length===0&&<p className="text-sm text-[#8f9391]">No accepted artifact exists for this week.</p>}{publications.map(p=><article key={p.id} className="rounded-xl border border-white/10 p-5"><p>Revision {p.revision} · {p.state} · {p.acceptedAt.toISOString()}</p><p className="mt-2 break-all text-xs">SHA-256: {p.contentChecksum}</p><p className="mt-2 text-sm">{p.reason}</p><p className="mt-2 text-xs">Run {p.scoringRunId} · Manifest {p.manifestId} · Previous {p.supersedesId??"None"}</p><a className="mt-3 inline-block text-[#b8d4c8]" href={`/api/command-center/sports/canonical-results/${p.id}`}>Download {p.state==="ACCEPTED"?"Canonical Results":"historical artifact (not current authority)"}</a>{authority&&p.state==="ACCEPTED"&&<form action={withdrawCanonicalWeek} className="mt-3">{hidden}<input type="hidden" name="publicationId" value={p.id}/><label>Withdrawal reason<input required name="reason" className={`${control} ml-2`}/></label><button className={`${control} ml-3`}>Withdraw authority</button></form>}</article>)}</section>
  </div>;
}
