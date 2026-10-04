import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/command-center/confirm-button";
import { FormNotice } from "@/components/command-center/form-notice";
import { GrowthBriefForm } from "@/components/command-center/growth-brief-form";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { briefApprovalGaps, briefFieldLabels, growthStageLabels } from "@/lib/growth/briefs";
import { canAllocatePortfolio, canEditGrowth } from "@/lib/growth/permissions";
import { portfolioAllocationLabels } from "@/lib/growth/priorities";
import { approveGrowthBriefAction, archiveGrowthBriefAction, createGrowthBriefAction, reviseGrowthBriefAction, updateGrowthBriefAction } from "@/lib/growth/server-actions";
import { formatCentralDate, formatCentralDateTime } from "@/lib/growth/time";
import { prisma } from "@/lib/prisma";

const statusTone: Record<string, string> = { CURRENT: "text-[#87d2ac] border-[#87d2ac]/30", DRAFT: "text-[#f0bd65] border-[#f0bd65]/30", SUPERSEDED: "text-[#8f9391] border-white/10", ARCHIVED: "text-[#666] border-white/10" };
const textFields = ["priorityAudience", "offer", "activationDefinition", "repeatDefinition", "bottleneck", "primaryMotion", "geographyNotes", "capacityNotes", "notes"] as const;

export default async function BrandGrowthPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ brief?: string; saved?: string; error?: string }> }) {
  const [{ id }, query, user] = await Promise.all([params, searchParams, requireCommandCenterUser()]);
  const [brand, markets] = await Promise.all([
    prisma.brand.findUnique({ where: { id }, include: { growthBriefs: { include: { createdBy: true, approvedBy: true, market: true }, orderBy: { revision: "desc" } }, portfolioPriorities: { include: { decidedBy: true }, orderBy: { revision: "desc" } } } }),
    prisma.market.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!brand) notFound();
  const current = brand.growthBriefs.find((brief) => brief.status === "CURRENT") ?? null;
  const selected = query.brief ? brand.growthBriefs.find((brief) => brief.id === query.brief) ?? null : brand.growthBriefs.find((brief) => brief.status === "DRAFT") ?? null;
  const priority = brand.portfolioPriorities.find((row) => row.status === "CURRENT") ?? null;
  const editable = canEditGrowth(user.role);
  const shown = selected ?? current;
  const gaps = selected?.status === "DRAFT" ? briefApprovalGaps(selected) : [];

  return <div className="max-w-5xl">
    <Link href={`/command-center/brands/${brand.id}`} className="text-xs text-[#b8d4c8]">← {brand.name} Brand Brain</Link>
    <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#747976]">Growth strategy</p><h1 className="mt-2 font-display text-3xl text-white">{brand.name}</h1><p className="mt-2 text-sm text-[#8f9391]">Time-bounded strategy, separate from the enduring Brand Brain. Only an approved (CURRENT) brief is authoritative.</p></div><Link href="/command-center/growth" className="h-fit text-xs text-[#b8d4c8]">Portfolio →</Link></div>
    <FormNotice saved={query.saved} error={query.error} />

    <section className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/8 bg-[#101214] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[#747976]">Portfolio allocation</p>{priority ? <><p className="mt-2 text-lg text-white">{portfolioAllocationLabels[priority.allocation]}</p><p className="mt-1 text-xs text-[#747976]">r{priority.revision} · since {formatCentralDate(priority.effectiveAt)} · review {formatCentralDate(priority.reviewAt)} · by {priority.decidedBy?.name || priority.decidedBy?.email || "unknown"}</p><p className="mt-2 text-sm text-[#d4d7d5]">{priority.rationale}</p></> : <p className="mt-2 text-sm text-[#747976]">Not set. {canAllocatePortfolio(user.role) ? <Link href="/command-center/growth" className="text-[#b8d4c8]">Set on Growth →</Link> : "Owner/Admin decision."}</p>}</div>
      <div className="rounded-2xl border border-white/8 bg-[#101214] p-5"><p className="text-[10px] uppercase tracking-[.14em] text-[#747976]">Current brief</p>{current ? <><p className="mt-2 text-lg text-white">{growthStageLabels[current.stage]} · r{current.revision}</p><p className="mt-1 text-xs text-[#747976]">Effective {formatCentralDate(current.effectiveAt)} · review {formatCentralDate(current.reviewAt)} · approved by {current.approvedBy?.name || current.approvedBy?.email || "unknown"}</p></> : <p className="mt-2 text-sm text-[#747976]">No approved brief yet.</p>}</div>
    </section>

    {shown && <section className="mt-6 rounded-2xl border border-white/8 bg-[#101214] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl text-white">Revision {shown.revision} <span className={`ml-2 rounded-full border px-2 py-0.5 align-middle text-[10px] ${statusTone[shown.status]}`}>{shown.status}</span></h2>
        <div className="flex flex-wrap gap-2">{editable && shown.status !== "DRAFT" && <form action={reviseGrowthBriefAction.bind(null, shown.id)}><button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white">Start new revision from r{shown.revision}</button></form>}
          {editable && shown.status === "DRAFT" && <><form action={approveGrowthBriefAction.bind(null, shown.id)}><ConfirmButton confirmation={current ? `Approve r${shown.revision}? r${current.revision} will be superseded (preserved in history).` : `Approve r${shown.revision} as the CURRENT brief?`} className={`rounded-lg px-3 py-2 text-xs font-semibold ${gaps.length ? "border border-white/10 text-[#747976]" : "bg-[#b8d4c8] text-[#07100c]"}`}>Approve as CURRENT</ConfirmButton></form><form action={archiveGrowthBriefAction.bind(null, shown.id)}><ConfirmButton confirmation="Archive this draft?" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#8f9391]">Archive draft</ConfirmButton></form></>}</div></div>
      {shown.status === "DRAFT" && gaps.length > 0 && <p className="mt-3 rounded-lg border border-[#f0bd65]/25 bg-[#f0bd65]/5 px-3 py-2 text-xs text-[#e2c58f]">Not approvable yet. Missing: {gaps.join(", ")}.</p>}
      <dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-[10px] uppercase tracking-[.12em] text-[#747976]">Stage</dt><dd className="mt-1 text-sm text-white">{growthStageLabels[shown.stage]}{shown.market ? ` · ${shown.market.name}` : ""}</dd></div><div><dt className="text-[10px] uppercase tracking-[.12em] text-[#747976]">Effective → review (CT)</dt><dd className="mt-1 text-sm text-white">{formatCentralDate(shown.effectiveAt)} → {formatCentralDate(shown.reviewAt)}</dd></div>{textFields.map((field) => <div key={field}><dt className="text-[10px] uppercase tracking-[.12em] text-[#747976]">{briefFieldLabels[field]}</dt><dd className={`mt-1 whitespace-pre-wrap text-sm ${shown[field] ? "text-[#d4d7d5]" : "text-[#555]"}`}>{shown[field] || "—"}</dd></div>)}</dl>
      {editable && shown.status === "DRAFT" && <details className="mt-6 rounded-xl border border-white/8 p-4" open={!shown.priorityAudience && !shown.offer}><summary className="cursor-pointer text-xs text-[#b8d4c8]">Edit draft</summary><div className="mt-4"><GrowthBriefForm action={updateGrowthBriefAction.bind(null, shown.id)} markets={markets} brief={shown} submitLabel="Save draft" /></div></details>}
    </section>}

    {editable && !brand.growthBriefs.some((brief) => brief.status === "DRAFT") && <details className="mt-6 rounded-2xl border border-white/8 bg-[#101214] p-6" open={!brand.growthBriefs.length}><summary className="cursor-pointer font-display text-lg text-white">+ New blank draft brief</summary><div className="mt-5"><GrowthBriefForm action={createGrowthBriefAction.bind(null, brand.id)} markets={markets} submitLabel="Save draft" /></div></details>}

    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div><h2 className="font-display text-lg text-white">Brief history</h2><ul className="mt-3 space-y-2">{brand.growthBriefs.map((brief) => <li key={brief.id}><Link href={`/command-center/brands/${brand.id}/growth?brief=${brief.id}`} className={`block rounded-xl border bg-[#101214] p-3 text-sm hover:border-[#b8d4c8]/30 ${brief.id === shown?.id ? "border-[#b8d4c8]/40" : "border-white/8"}`}><span className="text-white">r{brief.revision} · {growthStageLabels[brief.stage]}</span> <span className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] ${statusTone[brief.status]}`}>{brief.status}</span><small className="mt-1 block text-[#747976]">Created {formatCentralDateTime(brief.createdAt)} by {brief.createdBy?.name || brief.createdBy?.email || "system onboarding"}{brief.approvedAt ? ` · approved ${formatCentralDateTime(brief.approvedAt)}` : ""}</small></Link></li>)}{!brand.growthBriefs.length && <li className="text-sm text-[#777b78]">No briefs yet.</li>}</ul></div>
      <div><h2 className="font-display text-lg text-white">Allocation history</h2><ul className="mt-3 space-y-2">{brand.portfolioPriorities.map((row) => <li key={row.id} className="rounded-xl border border-white/8 bg-[#101214] p-3 text-sm"><span className="text-white">r{row.revision} · {portfolioAllocationLabels[row.allocation]}</span> <span className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] ${statusTone[row.status]}`}>{row.status}</span><small className="mt-1 block text-[#747976]">{formatCentralDate(row.effectiveAt)} · {row.decidedBy?.name || row.decidedBy?.email || "unknown"}{row.weeklyHours !== null ? ` · ${row.weeklyHours} h/wk` : ""}</small><small className="mt-1 block text-[#8f9391]">{row.rationale}</small></li>)}{!brand.portfolioPriorities.length && <li className="text-sm text-[#777b78]">No allocation decisions yet.</li>}</ul></div>
    </section>
  </div>;
}
