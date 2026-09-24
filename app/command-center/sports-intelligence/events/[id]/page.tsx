import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/command-center/page-header";
import { prisma } from "@/lib/prisma";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.growthEvent.findUnique({ where: { id }, include: { canonicalLeague: { include: { sport: true } }, canonicalSeason: true, homeTeam: true, awayTeam: true, venue: true, market: true, campaigns: true, activations: { include: { campaign: true } }, recommendations: { include: { brand: true } }, opportunities: true, externalIdentities: true } });
  if (!event) notFound();
  return <div><PageHeader title={event.name} description={`${event.canonicalLeague?.name ?? event.league ?? "Event"} · ${event.startsAt.toLocaleString()} · ${event.status.replaceAll("_", " ")}`} />
    <section className="mt-7 grid gap-5 lg:grid-cols-2"><article className="rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">Canonical sports context</h2><dl className="mt-4 space-y-3 text-sm"><Row label="Teams" value={`${event.awayTeam?.name ?? "TBD"} at ${event.homeTeam?.name ?? "TBD"}`} /><Row label="Venue" value={event.venue?.name ?? event.venueName ?? "TBD"} /><Row label="Market" value={event.market?.name ?? "Unassigned"} /><Row label="Season" value={event.canonicalSeason?.label ?? String(event.season ?? "Unassigned")} /><Row label="Source identities" value={event.externalIdentities.map((item) => `${item.provider}:${item.externalId}`).join(" · ") || `${event.source}:${event.sourceEventId}`} /></dl></article><article className="rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">SNG action context</h2><p className="mt-4 text-sm text-[#8f9391]">{event.campaigns.length} campaigns · {event.activations.length} activations · {event.recommendations.length} recommendations · {event.opportunities.length} opportunities</p><div className="mt-4 space-y-2">{event.recommendations.map((item) => <div key={item.id} className="rounded-xl border border-white/7 p-3 text-xs"><p className="text-white">{item.brand.name} · {item.outcome.replaceAll("_", " ")}</p><p className="mt-1 text-[#777b78]">{item.reason}</p></div>)}</div><Link href={`/command-center/ai-lab?event=${event.id}`} className="mt-5 inline-block rounded-lg bg-[#b8d4c8] px-4 py-2 text-xs font-semibold text-[#07100c]">Open trusted event in AI Lab</Link></article></section>
  </div>;
}
function Row({ label, value }: { label: string; value: string }) { return <div className="grid grid-cols-[9rem_1fr] gap-3"><dt className="text-[#777b78]">{label}</dt><dd className="text-white">{value}</dd></div>; }
