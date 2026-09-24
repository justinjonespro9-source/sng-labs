import { notFound } from "next/navigation";
import { PageHeader } from "@/components/command-center/page-header";
import { prisma } from "@/lib/prisma";

export default async function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const market = await prisma.market.findUnique({ where: { id }, include: { teams: { include: { canonicalLeague: true } }, venues: true, events: { where: { type: "GAME" }, orderBy: { startsAt: "asc" }, take: 40 }, campaigns: true, opportunities: true, organizations: true, relevancePolicies: { include: { brand: true } } } });
  if (!market) notFound();
  return <div><PageHeader title={market.name} description="Canonical market context across teams, venues, events, campaigns, opportunities, and relationships." /><section className="mt-7 grid gap-5 lg:grid-cols-3"><Card title="Teams & venues" lines={[...market.teams.map((team) => `${team.canonicalLeague?.code ?? team.league} · ${team.name}`), ...market.venues.map((venue) => `Venue · ${venue.name}`)]} /><Card title="Upcoming sports" lines={market.events.map((event) => `${event.startsAt.toLocaleDateString()} · ${event.name}`)} /><Card title="SNG portfolio" lines={[`${market.campaigns.length} campaigns`, `${market.opportunities.length} opportunities`, `${market.organizations.length} organizations`, ...market.relevancePolicies.map((item) => `${item.brand.name} · ${item.priority}`)]} /></section></div>;
}
function Card({ title, lines }: { title: string; lines: string[] }) { return <article className="rounded-2xl border border-white/8 bg-[#101214] p-6"><h2 className="font-display text-lg text-white">{title}</h2><div className="mt-4 space-y-2">{lines.map((line, index) => <p key={`${line}-${index}`} className="text-sm text-[#8f9391]">{line}</p>)}{!lines.length && <p className="text-sm text-[#777b78]">No records yet.</p>}</div></article>; }
