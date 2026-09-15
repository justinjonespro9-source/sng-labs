import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, Select, SubmitButton, TextArea } from "@/components/command-center/form-fields";
import { updateContentDraft } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

function dateTimeValue(value: Date | null) {
  return value ? new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
}

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [draft, brands] = await Promise.all([
    prisma.contentDraft.findUnique({ where: { id }, include: { brandAngle: { include: { opportunity: { include: { markets: true, teams: true, campaigns: { include: { campaign: true } } } } } }, socialAccount: true } }),
    prisma.brand.findMany({ where: { active: true }, include: { socialAccounts: { where: { connectionStatus: "CONNECTED" } } }, orderBy: { name: "asc" } }),
  ]);
  if (!draft) notFound();
  if (["PUBLISHED", "ARCHIVED"].includes(draft.status)) notFound();
  const context = draft.brandAngle.opportunity;
  const selectedBrand = brands.find((brand) => brand.id === draft.brandAngle.brandId);
  const accounts = selectedBrand?.socialAccounts || [];
  return <div>
    <Link href="/command-center/queue" className="text-xs text-[#b8d4c8]">← Content Queue</Link>
    <h1 className="mt-5 font-display text-3xl text-white">Edit Content</h1>
    <p className="mt-2 text-sm text-[#8f9391]">Originating Opportunity: {context.title}</p>
    <section className="mt-6 rounded-2xl border border-white/8 bg-[#101214] p-5"><p className="text-sm text-white">{context.summary}</p><p className="mt-2 text-xs text-[#747976]">{[...context.markets.map((x) => x.name), ...context.teams.map((x) => x.name), ...context.campaigns.map((x) => x.campaign.name)].join(" · ") || "Portfolio-wide"}</p></section>
    <form action={updateContentDraft.bind(null, draft.id)} className="mt-6 space-y-4 rounded-2xl border border-white/8 bg-[#101214] p-6">
      <Select label="Brand / editorial owner" name="brandId" required defaultValue={draft.brandAngle.brandId}>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</Select>
      <Field label="Objective" name="objective" required defaultValue={draft.objective} />
      <Field label="Distinct editorial hook" name="hook" required defaultValue={draft.hook} />
      <TextArea label="Angle rationale" name="rationale" rows={3} required defaultValue={draft.rationale} />
      <TextArea label="Draft copy" name="body" rows={8} required defaultValue={draft.body} />
      <TextArea label="Visual brief / asset notes" name="visualBrief" rows={3} defaultValue={draft.visualBrief || ""} />
      <Field label="CTA" name="callToAction" defaultValue={draft.callToAction || ""} />
      {accounts.length > 0 && <div className="grid gap-4 sm:grid-cols-2"><Select label="Channel" name="socialAccountId" defaultValue={draft.socialAccountId || ""}><option value="">No channel selected</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.platform} {account.handle || ""}</option>)}</Select><Field label="Intended publish time" name="scheduledFor" type="datetime-local" defaultValue={dateTimeValue(draft.scheduledFor)} /></div>}
      {!accounts.length && <p className="text-xs text-[#f0bd65]">Add a connected social account to this brand before scheduling. No platform publishing is enabled.</p>}
      {["APPROVED", "READY"].includes(draft.status) && <p className="text-xs text-[#f0bd65]">Changing brand, copy, CTA, hook, rationale, or visual brief invalidates the current approval and returns this item to Needs Review.</p>}
      {draft.status === "REJECTED" && <p className="text-xs text-[#f0bd65]">Saving a rejected item returns it to Draft.</p>}
      <SubmitButton>Save Content</SubmitButton>
    </form>
  </div>;
}
