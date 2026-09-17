import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/command-center/page-header";
import { acceptRecommendation, dismissRecommendation, evaluateNflWeekAction, skipRecommendation } from "@/lib/game-day/actions";
import { prisma } from "@/lib/prisma";

const reviewStatuses = ["PENDING", "ACCEPTED", "SKIPPED", "DISMISSED", "STALE"] as const;

function outcomeStyle(outcome: string) {
  if (outcome === "CREATE_OPPORTUNITY") return "border-[#b8d4c8]/25 bg-[#b8d4c8]/7 text-[#c7d9d1]";
  if (outcome === "NEEDS_CONTEXT") return "border-[#f0bd65]/25 bg-[#f0bd65]/7 text-[#e2c58f]";
  return "border-white/10 bg-white/[.025] text-[#8f9391]";
}

export default async function LiveDeskPage({ searchParams }: { searchParams: Promise<{ league?: string; season?: string; week?: string; date?: string; status?: string }> }) {
  const filters = await searchParams;
  const league = filters.league === "NFL" || !filters.league ? "NFL" : filters.league;
  const season = Number(filters.season || 2026);
  const week = Number(filters.week || 1);
  const reviewStatus = reviewStatuses.includes(filters.status as typeof reviewStatuses[number]) ? filters.status as typeof reviewStatuses[number] : undefined;
  const startDate = filters.date ? new Date(`${filters.date}T00:00:00.000Z`) : null;
  const endDate = startDate ? new Date(startDate.getTime() + 86_400_000) : null;
  const eventWhere = { league, season, week, ...(startDate && endDate ? { startsAt: { gte: startDate, lt: endDate } } : {}) };
  const [events, recommendations] = await Promise.all([
    prisma.growthEvent.findMany({ where: eventWhere, include: { homeTeam: true, awayTeam: true, venue: true, market: true }, orderBy: { startsAt: "asc" } }),
    prisma.opportunityRecommendation.findMany({
      where: { reviewStatus, OR: [{ event: eventWhere }, { scopeKey: { startsWith: `${league.toLowerCase()}-${season}-week-${week}:` } }] },
      include: { brand: true, event: { include: { homeTeam: true, awayTeam: true, venue: true } }, campaign: true, activation: true, acceptedOpportunity: true },
      orderBy: [{ priority: "desc" }, { evaluatedAt: "desc" }],
    }),
  ]);
  const slateRecommendations = recommendations.filter((item) => !item.eventId);
  const byEvent = new Map<string, typeof recommendations>();
  for (const recommendation of recommendations.filter((item) => item.eventId)) {
    const list = byEvent.get(recommendation.eventId!) ?? [];
    list.push(recommendation);
    byEvent.set(recommendation.eventId!, list);
  }

  return <div><PageHeader title="Live Desk" description="Review deterministic game-day relevance, accept qualified recommendations into the existing Opportunity workflow, and explicitly skip weak signals." />
    <section className="mt-7 rounded-2xl border border-white/8 bg-[#101214] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-[#8f9391]">League<select name="league" defaultValue={league} className="mt-1 block rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2 text-sm text-white"><option>NFL</option></select></label>
          <label className="text-xs text-[#8f9391]">Season<input name="season" type="number" defaultValue={season} className="mt-1 block w-24 rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs text-[#8f9391]">Week<input name="week" type="number" min="1" max="22" defaultValue={week} className="mt-1 block w-20 rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs text-[#8f9391]">Date<input name="date" type="date" defaultValue={filters.date || ""} className="mt-1 block rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2 text-sm text-white" /></label>
          <label className="text-xs text-[#8f9391]">Review state<select name="status" defaultValue={reviewStatus || ""} className="mt-1 block rounded-lg border border-white/10 bg-[#080a0b] px-3 py-2 text-sm text-white"><option value="">All</option>{reviewStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white">Filter</button>
        </form>
        <form action={evaluateNflWeekAction}><input type="hidden" name="season" value={season} /><input type="hidden" name="week" value={week} /><button className="rounded-lg bg-[#b8d4c8] px-4 py-2 text-sm font-semibold text-[#07100c]">Evaluate NFL week</button></form>
      </div>
      <p className="mt-4 text-xs leading-5 text-[#747976]">Evaluation is deterministic and creates reviewable recommendations only. It does not call AI, create Content, publish, or poll external sources.</p>
    </section>

    <section className="mt-8"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#b8d4c8]">Slate decisions</p><h2 className="mt-2 font-display text-xl text-white">NFL {season} · Week {week}</h2></div><span className="text-xs text-[#747976]">{slateRecommendations.length} decisions</span></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">{slateRecommendations.map((item) => <RecommendationCard key={item.id} item={item} />)}{!slateRecommendations.length && <p className="rounded-2xl border border-dashed border-white/10 p-7 text-sm text-[#8f9391]">Evaluate this week to create slate-level decisions without generating per-game noise.</p>}</div>
    </section>

    <section className="mt-9"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#b8d4c8]">Canonical schedule</p><h2 className="mt-2 font-display text-xl text-white">Events</h2></div><span className="text-xs text-[#747976]">{events.length} imported events</span></div>
      <div className="mt-4 space-y-4">{events.map((event) => { const eventRecommendations = byEvent.get(event.id) ?? []; return <article key={event.id} className="rounded-2xl border border-white/8 bg-[#101214] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.15em] text-[#747976]">{event.startsAt.toLocaleString()} · {event.status.replaceAll("_", " ")}</p><h3 className="mt-2 font-display text-lg text-white">{event.awayTeam?.name ?? "Away team"} at {event.homeTeam?.name ?? "Home team"}</h3><p className="mt-1 text-xs text-[#8f9391]">{event.venue?.name ?? event.venueName ?? "Venue TBD"}{event.neutralSite ? " · Neutral site" : event.market ? ` · ${event.market.name}` : ""}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#b8d4c8]">{eventRecommendations.length} recommendation{eventRecommendations.length === 1 ? "" : "s"}</span></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{eventRecommendations.map((item) => <RecommendationCard key={item.id} item={item} />)}{!eventRecommendations.length && <p className="text-xs text-[#747976]">No relevant brand execution was recommended for this event.</p>}</div></article>; })}{!events.length && <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-[#8f9391]">No imported events match this filter. Run the reviewed fixture import first.</p>}</div>
    </section>
  </div>;
}

type RecommendationItem = Prisma.OpportunityRecommendationGetPayload<{ include: { brand: true; event: { include: { homeTeam: true; awayTeam: true; venue: true } }; campaign: true; activation: true; acceptedOpportunity: true } }>;

function RecommendationCard({ item }: { item: RecommendationItem }) {
  return <div className={`rounded-xl border p-4 ${outcomeStyle(item.outcome)}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-white">{item.brand.name}</p><span className="text-[10px] uppercase tracking-[.12em]">{item.outcome.replaceAll("_", " ")} · {item.priority}</span></div><p className="mt-2 text-xs leading-5 opacity-90">{item.reason}</p><p className="mt-2 text-[10px] uppercase tracking-[.12em] opacity-60">{item.scope} · {item.reviewStatus}</p><div className="mt-3 flex flex-wrap gap-2">{item.acceptedOpportunity ? <Link href={`/command-center/opportunities/${item.acceptedOpportunity.id}/content`} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white">Open Opportunity</Link> : item.outcome !== "SKIP" && item.reviewStatus !== "DISMISSED" ? <form action={acceptRecommendation.bind(null, item.id)}><button className="rounded-lg bg-[#b8d4c8] px-3 py-1.5 text-xs font-semibold text-[#07100c]">Accept</button></form> : null}{!item.acceptedOpportunity && item.reviewStatus !== "SKIPPED" && item.reviewStatus !== "DISMISSED" && <form action={skipRecommendation.bind(null, item.id)}><button className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white">Skip</button></form>}{!item.acceptedOpportunity && item.reviewStatus === "SKIPPED" && <form action={dismissRecommendation.bind(null, item.id)}><button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs">Dismiss</button></form>}</div></div>;
}
