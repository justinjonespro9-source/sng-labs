import Link from "next/link";
import { Field, Select, SubmitButton, TextArea } from "@/components/command-center/form-fields";
import { FormNotice } from "@/components/command-center/form-notice";
import { PageHeader } from "@/components/command-center/page-header";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { growthActionStatusLabels, growthActionStatuses } from "@/lib/growth/actions-rules";
import { growthStageLabels, reviewState, type ReviewState } from "@/lib/growth/briefs";
import { canAllocatePortfolio, canEditGrowth } from "@/lib/growth/permissions";
import { portfolioAllocationLabels, portfolioAllocations, portfolioCapacityWarnings } from "@/lib/growth/priorities";
import { createGrowthActionAction, setPortfolioPriorityAction, updateGrowthActionAction } from "@/lib/growth/server-actions";
import { formatCentralDate } from "@/lib/growth/time";
import { prisma } from "@/lib/prisma";

const reviewTone: Record<ReviewState, string> = { OVERDUE: "text-[#ec7f72]", DUE_SOON: "text-[#f0bd65]", SCHEDULED: "text-[#8f9391]", NOT_SCHEDULED: "text-[#747976]" };
const reviewLabel: Record<ReviewState, string> = { OVERDUE: "Review overdue", DUE_SOON: "Review due soon", SCHEDULED: "Review scheduled", NOT_SCHEDULED: "No review date" };

export default async function GrowthPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [notice, user] = await Promise.all([searchParams, requireCommandCenterUser()]);
  const now = new Date();
  const [brands, actions, users, campaigns, relationships] = await Promise.all([
    prisma.brand.findMany({ where: { active: true }, include: { portfolioPriorities: { where: { status: "CURRENT" }, include: { decidedBy: true } }, growthBriefs: { where: { status: { in: ["CURRENT", "DRAFT"] } }, orderBy: { revision: "desc" } } }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.growthAction.findMany({ where: { status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] } }, include: { owner: true, brand: true, campaign: true, relationship: { include: { organization: true } } }, orderBy: [{ operatorPriority: { sort: "asc", nulls: "last" } }, { dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] }),
    prisma.user.findMany({ where: { role: { in: ["OWNER", "ADMIN", "EDITOR"] } }, select: { id: true, name: true, email: true }, orderBy: { email: "asc" } }),
    prisma.campaign.findMany({ where: { status: { in: ["PLANNING", "ACTIVE", "PAUSED"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.relationship.findMany({ where: { stage: { notIn: ["CLOSED", "NOT_PURSUING"] } }, select: { id: true, name: true, organization: { select: { name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);
  const rows = brands.map((brand) => ({ brand, priority: brand.portfolioPriorities[0] ?? null, current: brand.growthBriefs.find((brief) => brief.status === "CURRENT") ?? null, drafts: brand.growthBriefs.filter((brief) => brief.status === "DRAFT") }));
  const warnings = portfolioCapacityWarnings(rows.flatMap(({ brand, priority }) => priority ? [{ brandName: brand.name, allocation: priority.allocation, weeklyHours: priority.weeklyHours }] : []));
  const reviewQueue = [
    ...rows.flatMap(({ brand, drafts }) => drafts.map((draft) => ({ key: `draft-${draft.id}`, href: `/command-center/brands/${brand.id}/growth?brief=${draft.id}`, label: `${brand.name}: Growth Brief r${draft.revision} awaiting approval`, tone: "text-[#f0bd65]" }))),
    ...rows.flatMap(({ brand, current }) => current && ["OVERDUE", "DUE_SOON"].includes(reviewState(current.reviewAt, now)) ? [{ key: `brief-${current.id}`, href: `/command-center/brands/${brand.id}/growth`, label: `${brand.name}: brief review ${formatCentralDate(current.reviewAt)}`, tone: reviewTone[reviewState(current.reviewAt, now)] }] : []),
    ...rows.flatMap(({ brand, priority }) => priority && ["OVERDUE", "DUE_SOON"].includes(reviewState(priority.reviewAt, now)) ? [{ key: `priority-${priority.id}`, href: `/command-center/brands/${brand.id}/growth`, label: `${brand.name}: priority review ${formatCentralDate(priority.reviewAt)}`, tone: reviewTone[reviewState(priority.reviewAt, now)] }] : []),
  ];
  const canAllocate = canAllocatePortfolio(user.role);
  const editable = canEditGrowth(user.role);

  return <div>
    <PageHeader title="Growth" description={`Human portfolio allocation and versioned strategy across ${brands.length} active brands. Nothing here is inferred: priorities and briefs exist only when an operator sets them.`} />
    <FormNotice saved={notice.saved} error={notice.error} />
    {warnings.map((warning) => <div key={warning} className="mt-4 rounded-xl border border-[#f0bd65]/30 bg-[#f0bd65]/5 px-4 py-3 text-sm text-[#e2c58f]">Capacity warning: {warning}</div>)}

    <section className="mt-7"><h2 className="font-display text-xl text-white">Review queue</h2>
      {reviewQueue.length ? <ul className="mt-3 space-y-2">{reviewQueue.map((item) => <li key={item.key}><Link href={item.href} className={`text-sm ${item.tone} hover:underline`}>{item.label}</Link></li>)}</ul> : <p className="mt-3 text-sm text-[#777b78]">Nothing awaiting approval or review.</p>}
    </section>

    <section className="mt-8"><h2 className="font-display text-xl text-white">Portfolio</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/8 bg-[#101214]"><table className="w-full min-w-[880px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[.12em] text-[#747976]"><tr><th className="px-4 py-3">Brand</th><th className="pr-3">Allocation</th><th className="pr-3">Current brief</th><th className="pr-3">Bottleneck / motion</th><th className="pr-3">Reviews</th></tr></thead><tbody>{rows.map(({ brand, priority, current, drafts }) => <tr key={brand.id} className="border-t border-white/7 align-top text-[#d4d7d5]">
        <td className="px-4 py-4"><Link href={`/command-center/brands/${brand.id}/growth`} className="font-medium text-white hover:text-[#b8d4c8]">{brand.name}</Link>{drafts.length > 0 && <small className="block text-[#f0bd65]">{drafts.length} draft{drafts.length > 1 ? "s" : ""}</small>}</td>
        <td className="pr-3 py-4">{priority ? <><span className="text-white">{portfolioAllocationLabels[priority.allocation]}</span><small className="block text-[#747976]">r{priority.revision} · since {formatCentralDate(priority.effectiveAt)}{priority.weeklyHours !== null ? ` · ${priority.weeklyHours} h/wk` : ""}</small><small className="block max-w-xs text-[#8f9391]">{priority.rationale}</small></> : <span className="text-[#747976]">Not set</span>}
          {canAllocate && <details className="mt-2"><summary className="cursor-pointer text-xs text-[#b8d4c8]">{priority ? "Change" : "Set"} allocation</summary><form action={setPortfolioPriorityAction.bind(null, brand.id)} className="mt-3 grid w-72 gap-3"><Select label="Allocation" name="allocation" required defaultValue={priority?.allocation ?? ""}><option value="">Select…</option>{portfolioAllocations.map((allocation) => <option key={allocation} value={allocation}>{portfolioAllocationLabels[allocation]}</option>)}</Select><TextArea label="Rationale" name="rationale" rows={2} required /><Field label="Weekly hours (optional)" name="weeklyHours" type="number" min={0} max={168} /><Field label="Effective (CT)" name="effectiveAt" type="date" /><Field label="Review by (CT)" name="reviewAt" type="date" /><TextArea label="Evidence (optional)" name="evidence" rows={2} /><SubmitButton>Record decision</SubmitButton></form></details>}</td>
        <td className="pr-3 py-4">{current ? <><span className="text-white">{growthStageLabels[current.stage]}</span><small className="block text-[#747976]">r{current.revision} · effective {formatCentralDate(current.effectiveAt)}</small></> : <span className="text-[#747976]">No approved brief</span>}</td>
        <td className="pr-3 py-4 text-xs">{current ? <><p>{current.bottleneck}</p><p className="mt-1 text-[#8f9391]">{current.primaryMotion}</p></> : "—"}</td>
        <td className="pr-3 py-4 text-xs">{current && <p className={reviewTone[reviewState(current.reviewAt, now)]}>Brief: {reviewLabel[reviewState(current.reviewAt, now)]}</p>}{priority && <p className={reviewTone[reviewState(priority.reviewAt, now)]}>Priority: {reviewLabel[reviewState(priority.reviewAt, now)]}</p>}</td>
      </tr>)}</tbody></table></div>
      {!rows.some((row) => row.priority) && <p className="mt-3 text-xs text-[#747976]">No portfolio priorities have been set. Allocations are human decisions and are never generated.{canAllocate ? "" : " Only an Owner or Admin can set them."}</p>}
    </section>

    <section className="mt-8"><h2 className="font-display text-xl text-white">Growth actions</h2><p className="mt-1 text-xs text-[#747976]">Real work items. Give an action a priority (1 = highest) to put it in Home&apos;s This Week (top three). Relationship next actions live on the relationship and are not duplicated here.</p>
      <div className="mt-4 space-y-3">{actions.map((action) => <div key={action.id} className="rounded-xl border border-white/8 bg-[#101214] p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-sm text-white">{action.operatorPriority !== null && <span className="mr-2 rounded bg-[#b8d4c8]/15 px-1.5 py-0.5 text-[10px] text-[#b8d4c8]">P{action.operatorPriority}</span>}{action.title}</p><p className="mt-1 text-xs text-[#747976]">{growthActionStatusLabels[action.status]} · {action.owner?.name || action.owner?.email || "Unassigned"} · due {formatCentralDate(action.dueAt)}{action.brand ? ` · ${action.brand.name}` : ""}{action.campaign ? ` · ${action.campaign.name}` : ""}{action.relationship ? ` · ${action.relationship.organization.name}` : ""}</p>{action.rationale && <p className="mt-1 text-xs text-[#8f9391]">Why: {action.rationale}</p>}{action.blocker && <p className="mt-1 text-xs text-[#ec7f72]">Blocked: {action.blocker}</p>}</div>
        {editable && <form action={updateGrowthActionAction.bind(null, action.id)} className="flex flex-wrap items-end gap-2"><Select label="Status" name="status" defaultValue={action.status}>{growthActionStatuses.map((status) => <option key={status} value={status}>{growthActionStatusLabels[status]}</option>)}</Select><Field label="Priority" name="operatorPriority" type="number" min={1} max={99} defaultValue={action.operatorPriority ?? ""} /><Field label="Blocker" name="blocker" defaultValue={action.blocker ?? ""} /><button className="rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white">Update</button></form>}</div></div>)}
        {!actions.length && <p className="text-sm text-[#777b78]">No open growth actions.</p>}</div>
      {editable && <details className="mt-4 rounded-2xl border border-white/8 bg-[#101214] p-5"><summary className="cursor-pointer text-sm text-[#b8d4c8]">+ Add growth action</summary><form action={createGrowthActionAction} className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3"><Field label="Title" name="title" required /></div>
        <Select label="Owner" name="ownerId" defaultValue={user.id}>{users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}</Select>
        <Field label="Priority (1 = highest, optional)" name="operatorPriority" type="number" min={1} max={99} />
        <Field label="Due (CT)" name="dueAt" type="date" />
        <Select label="Brand" name="brandId"><option value="">None</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</Select>
        <Select label="Campaign" name="campaignId"><option value="">None</option>{campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</Select>
        <Select label="Relationship" name="relationshipId"><option value="">None</option>{relationships.map((relationship) => <option key={relationship.id} value={relationship.id}>{relationship.organization.name} — {relationship.name}</option>)}</Select>
        <Select label="Status" name="status" defaultValue="OPEN"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="BLOCKED">Blocked</option></Select>
        <div className="sm:col-span-2"><Field label="Blocker (required if blocked)" name="blocker" /></div>
        <div className="sm:col-span-3"><TextArea label="Rationale" name="rationale" rows={2} /></div>
        <div className="sm:col-span-3"><TextArea label="Evidence" name="evidence" rows={2} /></div>
        <div><SubmitButton>Add action</SubmitButton></div>
      </form></details>}
    </section>
  </div>;
}
