import { CheckboxGroup, Field, SubmitButton, TextArea } from "@/components/command-center/form-fields";
import { PageHeader } from "@/components/command-center/page-header";
import { createCampaign } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

export default async function CampaignsPage() {
  const [campaigns, brands, markets, teams] = await Promise.all([
    prisma.campaign.findMany({ include: { brands: true, markets: true, teams: true, opportunities: true, relationships: true }, orderBy: { updatedAt: "desc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }), prisma.market.findMany({ orderBy: { name: "asc" } }), prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <div><PageHeader title="Campaigns" description="Coordinate content, distribution, outreach, attribution, and results around a shared objective." />
    <section className="mt-8 grid gap-4 xl:grid-cols-2">{campaigns.length ? campaigns.map((campaign) => <article key={campaign.id} className="rounded-2xl border border-white/8 bg-[#101214] p-6"><div className="flex justify-between"><h2 className="font-display text-xl text-white">{campaign.name}</h2><span className="text-[10px] uppercase tracking-[.14em] text-[#b8d4c8]">{campaign.status}</span></div><p className="mt-2 text-sm text-[#8f9391]">{campaign.objective || campaign.description || "Objective not set"}</p><p className="mt-5 text-xs text-[#747976]">{campaign.brands.map((x) => x.name).join(" · ") || "No brands"} · {campaign.opportunities.length} opportunities · {campaign.relationships.length} relationships</p></article>) : <p className="text-sm text-[#8f9391]">No campaigns yet.</p>}</section>
    <form action={createCampaign} className="mt-8 space-y-4 rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">Create campaign</h2><Field label="Name" name="name" required /><TextArea label="Objective" name="objective" rows={2} /><TextArea label="Description" name="description" rows={2} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Starts" name="startsAt" type="date" /><Field label="Ends" name="endsAt" type="date" /></div><p className="text-xs text-[#747976]">Brands</p><CheckboxGroup name="brandIds" items={brands} /><p className="text-xs text-[#747976]">Markets</p><CheckboxGroup name="marketIds" items={markets} /><p className="text-xs text-[#747976]">Teams</p><CheckboxGroup name="teamIds" items={teams} /><SubmitButton>Create campaign</SubmitButton></form>
  </div>;
}
