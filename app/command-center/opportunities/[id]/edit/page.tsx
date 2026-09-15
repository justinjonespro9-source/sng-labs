import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckboxGroup, Field, Select, SubmitButton, TextArea } from "@/components/command-center/form-fields";
import { updateOpportunity } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

function dateTimeValue(value: Date | null) {
  return value ? new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
}

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [opportunity, markets, teams, campaigns] = await Promise.all([
    prisma.opportunity.findUnique({ where: { id }, include: { activation: { include: { campaign: true } }, markets: true, teams: true, campaigns: true, angles: { include: { brand: true, drafts: { select: { id: true } } } } } }),
    prisma.market.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!opportunity) notFound();
  const contentCount = opportunity.angles.reduce((sum, angle) => sum + angle.drafts.length, 0);
  return <div>
    <Link href="/command-center/opportunities" className="text-xs text-[#b8d4c8]">← Opportunity Feed</Link>
    <h1 className="mt-5 font-display text-3xl text-white">Edit Opportunity</h1>
    <p className="mt-2 text-sm text-[#8f9391]">Linked content stays attached to this Opportunity. Existing relationships change only when you change the selections below.</p>
    {opportunity.activation && <p className="mt-3 rounded-lg border border-white/8 bg-[#101214] px-4 py-3 text-xs text-[#b8d4c8]">Activation context is preserved: {opportunity.activation.campaign.name} → {opportunity.activation.name}</p>}
    <form action={updateOpportunity.bind(null, opportunity.id)} className="mt-6 space-y-4 rounded-2xl border border-white/8 bg-[#101214] p-6">
      <Field label="Title" name="title" required defaultValue={opportunity.title} />
      <TextArea label="What is happening?" name="summary" rows={3} required defaultValue={opportunity.summary} />
      <TextArea label="Why does it matter?" name="whyItMatters" rows={2} defaultValue={opportunity.whyItMatters || ""} />
      <TextArea label="What should SNG do?" name="actionRecommendation" rows={2} defaultValue={opportunity.actionRecommendation || ""} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Source" name="sourceLabel" defaultValue={opportunity.sourceLabel || ""} />
        <Field label="Priority (0–100)" name="urgency" type="number" min="0" max="100" required defaultValue={opportunity.urgency} />
        <Field label="Recommended by" name="recommendedAt" type="datetime-local" defaultValue={dateTimeValue(opportunity.recommendedAt)} />
        <Select label="Status" name="status" defaultValue={opportunity.status}>{["NEW","REVIEWED","DEVELOPING","QUEUED","COMPLETE","NO_POST","DISMISSED"].map((status) => <option key={status}>{status}</option>)}</Select>
      </div>
      {opportunity.status === "NO_POST" && <TextArea label="Why not post?" name="noPostRationale" rows={2} defaultValue={opportunity.noPostRationale || ""} />}
      <p className="text-xs text-[#747976]">Markets</p><CheckboxGroup name="marketIds" items={markets} selectedIds={opportunity.markets.map((item) => item.id)} />
      <p className="text-xs text-[#747976]">Teams</p><CheckboxGroup name="teamIds" items={teams} selectedIds={opportunity.teams.map((item) => item.id)} />
      <p className="text-xs text-[#747976]">Campaigns</p><CheckboxGroup name="campaignIds" items={campaigns} selectedIds={opportunity.campaigns.map((item) => item.campaignId)} />
      <div className="rounded-xl border border-white/7 bg-[#080a0b] p-4 text-xs text-[#8f9391]">Brand context: {opportunity.angles.map((angle) => angle.brand.name).join(" · ") || "No brand angles yet"} · {contentCount} linked content item{contentCount === 1 ? "" : "s"}</div>
      <SubmitButton>Save Opportunity</SubmitButton>
    </form>
  </div>;
}
