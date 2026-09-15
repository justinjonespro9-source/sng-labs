import Link from "next/link";
import { ConfirmButton } from "@/components/command-center/confirm-button";
import { Field, Select } from "@/components/command-center/form-fields";
import { PageHeader } from "@/components/command-center/page-header";
import { deleteContentDraft, scheduleDraft, unscheduleDraft, updateDraftStatus } from "@/lib/command-center/actions";
import { contentStatuses } from "@/lib/command-center/content-workflow";
import { prisma } from "@/lib/prisma";

const actionClass = "rounded-lg border border-white/10 px-3 py-2 text-xs text-white";

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ status?: string; brand?: string }> }) {
  const filters = await searchParams;
  const drafts = await prisma.contentDraft.findMany({
    where: { status: contentStatuses.includes(filters.status as never) ? filters.status as never : undefined, brandAngle: filters.brand ? { brandId: filters.brand } : undefined },
    include: { brandAngle: { include: { brand: { include: { socialAccounts: { where: { connectionStatus: "CONNECTED" } } } }, opportunity: { include: { markets: true, teams: true, campaigns: { include: { campaign: true } } } } } }, socialAccount: true, approvals: { include: { reviewer: true }, orderBy: { createdAt: "desc" } }, publication: true },
    orderBy: { updatedAt: "desc" },
  });
  const brands = await prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return <div><PageHeader title="Content Queue" description="Draft, review, approve, and schedule—human approval remains the gate before public distribution." />
    <form className="mt-7 flex flex-wrap gap-3"><Select label="Status" name="status" defaultValue={filters.status || ""}><option value="">All statuses</option>{contentStatuses.map((status) => <option key={status}>{status.replaceAll("_", " ")}</option>)}</Select><Select label="Brand" name="brand" defaultValue={filters.brand || ""}><option value="">All brands</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</Select><button className="self-end rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white">Filter</button></form>
    <section className="mt-6 space-y-4">{drafts.length ? drafts.map((draft) => {
      const latestRevision = draft.approvals.find((approval) => approval.decision === "REVISION_REQUESTED");
      const connectedAccounts = draft.brandAngle.brand.socialAccounts;
      return <article key={draft.id} className="rounded-2xl border border-white/8 bg-[#101214] p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row"><div><p className="text-[10px] uppercase tracking-[.15em] text-[#b8d4c8]">{draft.brandAngle.brand.name} · {draft.status.replaceAll("_", " ")}</p><h2 className="mt-2 font-display text-xl text-white">{draft.hook}</h2><Link href={`/command-center/opportunities/${draft.brandAngle.opportunity.id}/edit`} className="mt-1 block text-xs text-[#747976]">From: {draft.brandAngle.opportunity.title}</Link></div>{draft.scheduledFor && <span className="text-xs text-[#b8d4c8]">{draft.scheduledFor.toLocaleString()}</span>}</div>
        <div className="mt-5 whitespace-pre-wrap rounded-xl border border-white/7 bg-[#080a0b] p-5 text-sm leading-6 text-[#d4d7d5]">{draft.body}</div>{draft.callToAction && <p className="mt-3 text-xs text-[#8f9391]">CTA: {draft.callToAction}</p>}<p className="mt-3 text-xs text-[#747976]">Objective: {draft.objective} · Angle: {draft.rationale}</p>
        {draft.status === "REVISION_REQUESTED" && latestRevision?.comment && <div className="mt-4 rounded-xl border border-[#f0bd65]/20 bg-[#f0bd65]/5 p-4 text-sm text-[#e2c58f]"><b>Revision requested:</b> {latestRevision.comment}</div>}
        <div className="mt-5 flex flex-wrap gap-2">
          {["DRAFT", "NEEDS_REVIEW", "REVISION_REQUESTED", "APPROVED", "READY", "REJECTED"].includes(draft.status) && <Link href={`/command-center/queue/${draft.id}/edit`} className={actionClass}>Edit</Link>}
          {draft.status === "DRAFT" && <><form action={updateDraftStatus.bind(null, draft.id)}><input type="hidden" name="status" value="NEEDS_REVIEW" /><button className={actionClass}>Send to Review</button></form><form action={deleteContentDraft.bind(null, draft.id)}><ConfirmButton confirmation="Delete this Draft? This cannot be undone." className="rounded-lg border border-[#ec7f72]/30 px-3 py-2 text-xs text-[#ec7f72]">Delete</ConfirmButton></form></>}
          {draft.status === "REVISION_REQUESTED" && <form action={updateDraftStatus.bind(null, draft.id)}><input type="hidden" name="status" value="NEEDS_REVIEW" /><button className={actionClass}>Resubmit for Review</button></form>}
          {draft.status === "NEEDS_REVIEW" && <><form action={updateDraftStatus.bind(null, draft.id)}><input type="hidden" name="status" value="APPROVED" /><button className="rounded-lg bg-[#b8d4c8] px-3 py-2 text-xs font-semibold text-[#07100c]">Approve</button></form><details className="rounded-lg border border-[#f0bd65]/30 px-3 py-2 text-xs text-[#f0bd65]"><summary className="cursor-pointer">Request Revision</summary><form action={updateDraftStatus.bind(null, draft.id)} className="mt-3 w-72 space-y-2"><input type="hidden" name="status" value="REVISION_REQUESTED" /><textarea name="comment" required rows={3} placeholder="What needs to change?" className="w-full rounded-lg border border-white/10 bg-[#080a0b] p-2 text-xs text-white" /><button className={actionClass}>Send Revision Notes</button></form></details><details className="rounded-lg border border-[#ec7f72]/30 px-3 py-2 text-xs text-[#ec7f72]"><summary className="cursor-pointer">Reject</summary><form action={updateDraftStatus.bind(null, draft.id)} className="mt-3 w-72 space-y-2"><textarea name="comment" rows={2} placeholder="Optional reason" className="w-full rounded-lg border border-white/10 bg-[#080a0b] p-2 text-xs text-white" /><input type="hidden" name="status" value="REJECTED" /><button className={actionClass}>Confirm Reject</button></form></details></>}
          {draft.status === "APPROVED" && connectedAccounts.length > 0 && <details className="w-full rounded-xl border border-white/8 p-4"><summary className="cursor-pointer text-xs text-[#b8d4c8]">Schedule approved content</summary><form action={scheduleDraft.bind(null, draft.id)} className="mt-4 grid gap-4 sm:grid-cols-2"><Select label="Channel" name="socialAccountId" required><option value="">Select connected account…</option>{connectedAccounts.map((account) => <option key={account.id} value={account.id}>{account.platform} {account.handle || ""}</option>)}</Select><Field label="Publish time" name="scheduledFor" type="datetime-local" required /><button className="rounded-lg bg-[#b8d4c8] px-4 py-2 text-xs font-semibold text-[#07100c]">Schedule</button></form></details>}
          {draft.status === "APPROVED" && !connectedAccounts.length && <p className="w-full text-xs text-[#f0bd65]">Add a social account to this brand before scheduling. No platform publishing is enabled.</p>}
          {draft.status === "READY" && <form action={unscheduleDraft.bind(null, draft.id)}><button className={actionClass}>Unschedule</button></form>}
          {["APPROVED", "READY", "PUBLISHED", "REJECTED"].includes(draft.status) && <form action={updateDraftStatus.bind(null, draft.id)}><input type="hidden" name="status" value="ARCHIVED" /><ConfirmButton confirmation="Archive this content item? It will remain in history." className={actionClass}>Archive</ConfirmButton></form>}
        </div>
        {draft.approvals.length > 0 && <details className="mt-5 border-t border-white/7 pt-4"><summary className="cursor-pointer text-xs text-[#747976]">Review history ({draft.approvals.length})</summary><div className="mt-3 space-y-2">{draft.approvals.map((approval) => <p key={approval.id} className="text-xs text-[#8f9391]">{approval.createdAt.toLocaleString()} · {approval.decision.replaceAll("_", " ")}{approval.comment ? ` — ${approval.comment}` : ""}</p>)}</div></details>}
      </article>;
    }) : <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center"><p className="text-sm text-white">Nothing in this queue view</p><p className="mt-2 text-xs text-[#777b78]">Create content from an Opportunity to carry its context into a new draft.</p><Link href="/command-center/opportunities" className="mt-4 inline-block text-xs text-[#b8d4c8]">Open Opportunity Feed →</Link></div>}</section>
  </div>;
}
