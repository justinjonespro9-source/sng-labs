import { CheckboxGroup, Field, Select, SubmitButton } from "@/components/command-center/form-fields";
import { PageHeader } from "@/components/command-center/page-header";
import { createMarket, createTeam } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

export default async function MarketsPage() {
  const [markets, brands] = await Promise.all([
    prisma.market.findMany({ include: { teams: { include: { brands: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <div><PageHeader title="Markets & Teams" description="A lightweight strategy map connecting geography, teams, and legitimate product relevance." />
    <section className="mt-8 grid gap-5 xl:grid-cols-2">
      {markets.map((market) => <article key={market.id} className="rounded-2xl border border-white/8 bg-[#101214] p-6"><p className="text-[10px] uppercase tracking-[.16em] text-[#6f7471]">Market</p><h2 className="mt-2 font-display text-xl text-white">{market.name}</h2><div className="mt-5 space-y-3">{market.teams.map((team) => <div key={team.id} className="rounded-xl border border-white/7 bg-white/[.02] p-4"><div className="flex justify-between gap-4"><span className="text-sm font-medium text-white">{team.name}</span><span className="text-xs text-[#777b78]">{team.league}</span></div><p className="mt-2 text-xs text-[#8f9391]">{team.brands.map((brand) => brand.name).join(" · ") || "No brand relevance set"}</p></div>)}</div></article>)}
    </section>
    <section className="mt-8 grid gap-6 xl:grid-cols-2"><form action={createMarket} className="space-y-4 rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">Add market</h2><Field label="Name" name="name" required /><Field label="Key" name="key" placeholder="philadelphia" required /><Field label="Region" name="region" /><Field label="Notes" name="notes" /><SubmitButton>Add market</SubmitButton></form>
    <form action={createTeam} className="space-y-4 rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">Add team</h2><div className="grid gap-4 sm:grid-cols-2"><Field label="Name" name="name" required /><Field label="Key" name="key" required /><Select label="Market" name="marketId" required><option value="">Choose…</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</Select><Field label="Sport" name="sport" required /><Field label="League" name="league" required /><Field label="Venue" name="venueName" /></div><CheckboxGroup name="brandIds" items={brands} /><SubmitButton>Add team</SubmitButton></form></section>
  </div>;
}
