import { notFound } from "next/navigation";
import { PageHeader } from "@/components/command-center/page-header";
import { prisma } from "@/lib/prisma";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await prisma.team.findUnique({ where: { id }, include: { canonicalLeague: { include: { sport: true } }, market: true, homeVenue: true, externalIdentities: true, relevancePolicies: { include: { brand: true } }, homeEvents: { orderBy: { startsAt: "asc" }, take: 20 }, awayEvents: { orderBy: { startsAt: "asc" }, take: 20 } } });
  if (!team) notFound();
  const events = [...team.homeEvents, ...team.awayEvents].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return <div><PageHeader title={team.name} description={`${team.canonicalLeague?.name ?? team.league} · ${team.market.name} · ${team.homeVenue?.name ?? team.venueName ?? "Venue unassigned"}`} /><section className="mt-7 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><article className="rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">Identity & relevance</h2><p className="mt-4 text-sm text-[#8f9391]">{team.externalIdentities.map((item) => `${item.provider}:${item.externalId}`).join(" · ") || "Legacy identity only"}</p><div className="mt-4 space-y-2">{team.relevancePolicies.map((item) => <div key={item.id} className="rounded-xl border border-white/7 p-3"><p className="text-sm text-white">{item.brand.name} · {item.priority}</p><p className="mt-1 text-xs text-[#777b78]">{item.rationale}</p></div>)}</div></article><article className="rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">Schedule</h2><div className="mt-4 space-y-2">{events.map((event) => <div key={event.id} className="rounded-xl border border-white/7 p-3"><p className="text-sm text-white">{event.name}</p><p className="mt-1 text-xs text-[#777b78]">{event.startsAt.toLocaleString()} · {event.status}</p></div>)}</div></article></section></div>;
}
