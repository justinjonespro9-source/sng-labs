import { PageHeader } from "@/components/command-center/page-header";
import { prisma } from "@/lib/prisma";

export default async function AccountHealthPage() {
  const observations = await prisma.socialConnectionHealthObservation.findMany({ where: { resolvedAt: null }, include: { socialAccount: { include: { brand: true } } }, orderBy: { observedAt: "desc" } });
  return <div><PageHeader title="Account Health" description="Objective authorization, permission, API, and webhook health only. Audience performance is intentionally separate." />
    <section className="mt-8 space-y-3">{observations.map((item) => <article key={item.id} className="rounded-2xl border border-white/8 bg-[#101214] p-5"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-sm text-white">{item.socialAccount.brand.name} · {item.socialAccount.platform}</p><p className="mt-2 text-xs text-[#929795]">{item.summary}</p></div><span className="text-xs text-amber-200">{item.state.replaceAll("_", " ")}</span></div><p className="mt-3 text-[11px] text-[#666b68]">{item.code} · observed {item.observedAt.toLocaleString()}</p></article>)}{!observations.length && <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-[#8f9391]">No open Social Account connection-health actions.</p>}</section>
  </div>;
}

