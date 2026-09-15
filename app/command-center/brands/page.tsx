import Link from "next/link";
import { PageHeader } from "@/components/command-center/page-header";
import { hasConfiguredBrandBrain } from "@/lib/command-center/brand-brain";
import { prisma } from "@/lib/prisma";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({ include: { socialAccounts: true, teams: true }, orderBy: [{ kind: "asc" }, { name: "asc" }] });
  return <div><PageHeader title="Brand Brain" description="The editable strategic context behind every future recommendation and draft." />
    {brands.length ? <section className="mt-8 grid gap-5 xl:grid-cols-2">{brands.map((brand) => { const configured = hasConfiguredBrandBrain(brand); return <Link key={brand.id} href={`/command-center/brands/${brand.id}`} className="group rounded-2xl border border-white/8 bg-[#101214] p-6 hover:border-[#b8d4c8]/30"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#747976]">{brand.kind === "CORPORATE" ? "Corporate / founder voice" : "Product voice"}</p><h2 className="mt-2 font-display text-xl text-white">{brand.name}</h2><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#929795]">{brand.description}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] ${configured ? "border-[#87d2ac]/30 text-[#87d2ac]" : "border-white/10 text-[#777b78]"}`}>{configured ? `Brain v${brand.brandBrainVersion}` : "Not configured"}</span></div><div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/7 pt-4 text-xs text-[#777b78]"><span>{brand.contentPillars.length || brand.objectives.length} pillars</span><span>{brand.socialAccounts.length} channels</span><span>{brand.teams.length} teams</span></div><p className="mt-4 text-xs font-medium text-[#b8d4c8] group-hover:text-white">Open profile →</p></Link>; })}</section> : <section className="mt-8 rounded-2xl border border-dashed border-white/10 p-12 text-center"><p className="text-sm text-white">No brand profiles found</p><p className="mt-2 text-xs text-[#777b78]">Run the safe Command Center seed to create the seven editable starting profiles.</p></section>}
  </div>;
}
