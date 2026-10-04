import Link from "next/link";
import { PageHeader } from "@/components/command-center/page-header";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { brandDefinitions } from "@/lib/command-center/brand-definitions";
import { thisWeekActions, type GrowthActionStatus } from "@/lib/growth/actions-rules";
import { accountHealthSummary, openOpportunityWhere } from "@/lib/growth/dashboard";
import { isSchedulableDestination } from "@/lib/growth/manual-publication";
import { exclusiveEndToInclusive, formatMetricValue } from "@/lib/growth/measurements";
import { canEditGrowth } from "@/lib/growth/permissions";
import { loadRelationshipViews } from "@/lib/growth/relationship-read";
import { isRelationshipViewKey, relationshipOperatingRules, relationshipViewLabels, type RelationshipViewKey } from "@/lib/growth/relationships";
import { loadTargetProgress } from "@/lib/growth/scorecard";
import { addCentralDays, formatCalendarDay, formatCentralDate, formatCentralDateTime } from "@/lib/growth/time";
import { prisma } from "@/lib/prisma";

const card = "rounded-2xl border border-white/8 bg-[#101214] p-6";
const viewOrder: RelationshipViewKey[] = ["due", "overdue", "noNextAction", "stalled", "recentResponses"];

function SectionHeader({ index, title, detail, href, linkLabel }: { index: number; title: string; detail: string; href?: string; linkLabel?: string }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#5f6461]">{index}</p><h2 className="font-display text-lg font-semibold text-white">{title}</h2><p className="mt-1 text-xs text-[#7f8381]">{detail}</p></div>{href && <Link href={href} className="shrink-0 text-xs text-[#b8d4c8]">{linkLabel} →</Link>}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 rounded-xl border border-dashed border-white/10 px-5 py-6 text-sm leading-6 text-[#8f9391]">{children}</div>;
}

export default async function CommandCenterOverviewPage({ searchParams }: { searchParams: Promise<{ rel?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireCommandCenterUser()]);
  const now = new Date();
  const weekAhead = addCentralDays(now, 7);
  const editable = canEditGrowth(user.role);
  const [actions, approvals, draftBriefs, briefReviews, priorityReviews, endingCampaigns, progress, relationships, activeCampaigns, socialAccounts, snapshots, connectionAlerts, upcomingEvents, openOpportunities, openCount, scheduled, currentPriorities] = await Promise.all([
    prisma.growthAction.findMany({ where: { status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] } }, include: { owner: true, brand: true, campaign: true, relationship: { include: { organization: true } } } }),
    prisma.contentDraft.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.brandGrowthBrief.findMany({ where: { status: "DRAFT" }, include: { brand: true }, orderBy: { updatedAt: "desc" } }),
    prisma.brandGrowthBrief.findMany({ where: { status: "CURRENT", reviewAt: { lte: weekAhead } }, include: { brand: true }, orderBy: { reviewAt: "asc" } }),
    prisma.brandPortfolioPriority.findMany({ where: { status: "CURRENT", reviewAt: { lte: weekAhead } }, include: { brand: true }, orderBy: { reviewAt: "asc" } }),
    prisma.campaign.findMany({ where: { status: { in: ["ACTIVE", "COMPLETE"] }, endsAt: { lte: weekAhead } }, include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } }, orderBy: { endsAt: "asc" } }),
    loadTargetProgress({ campaign: { status: "ACTIVE" } }, now),
    loadRelationshipViews({ stage: { notIn: ["CLOSED", "NOT_PURSUING"] } }, now),
    prisma.campaign.findMany({ where: { status: "ACTIVE" }, include: { brands: { include: { socialAccounts: true } } } }),
    prisma.socialAccount.findMany({ where: { lifecycleStatus: { in: ["KNOWN", "ACTIVE"] } }, select: { id: true } }),
    prisma.accountHealthSnapshot.findMany({ select: { id: true, socialAccountId: true, state: true, calculatedAt: true } }),
    prisma.socialConnectionHealthObservation.findMany({ where: { operatorActionRequired: true, resolvedAt: null }, select: { dedupeKey: true }, distinct: ["dedupeKey"] }),
    prisma.growthEvent.findMany({ where: { startsAt: { gte: now, lt: weekAhead } }, include: { market: true }, orderBy: { startsAt: "asc" }, take: 5 }),
    prisma.opportunity.findMany({ where: openOpportunityWhere(now), orderBy: [{ urgency: "desc" }, { createdAt: "desc" }], take: 4 }),
    prisma.opportunity.count({ where: openOpportunityWhere(now) }),
    prisma.publication.count({ where: { status: { in: ["PLANNED", "READY"] } } }),
    prisma.brandPortfolioPriority.count({ where: { status: "CURRENT" } }),
  ]);

  const topActions = thisWeekActions(actions.map((action) => ({ ...action, status: action.status as GrowthActionStatus })));
  const blockedActions = actions.filter((action) => action.status === "BLOCKED");
  const reviewsDue = endingCampaigns.filter((campaign) => {
    if (!campaign.endsAt) return false;
    const last = campaign.reviews[0]?.reviewedAt;
    return !last || last.getTime() < campaign.endsAt.getTime() - 7 * 86_400_000;
  });
  const readinessGaps = new Map<string, { brand: string; campaigns: string[] }>();
  for (const campaign of activeCampaigns) for (const brand of campaign.brands) {
    if (brand.socialAccounts.some((account) => isSchedulableDestination(account, brand.id))) continue;
    const entry = readinessGaps.get(brand.id) ?? { brand: brand.name, campaigns: [] };
    entry.campaigns.push(campaign.name);
    readinessGaps.set(brand.id, entry);
  }
  const health = accountHealthSummary(socialAccounts.map((account) => account.id), snapshots);
  const relView: RelationshipViewKey = isRelationshipViewKey(query.rel) ? query.rel : "due";
  const relRows = relationships.views[relView].slice(0, 6);
  const decisionCount = (approvals ? 1 : 0) + draftBriefs.length + briefReviews.length + priorityReviews.length + reviewsDue.length;

  const counts = [
    { label: "Open opportunities", value: openCount, href: "/command-center/opportunities" },
    { label: "Needs approval", value: approvals, href: "/command-center/queue" },
    { label: "Scheduled / handoff", value: scheduled, href: "/command-center/queue" },
    { label: "Accounts on watch", value: health.onWatch, href: "/command-center/account-health", detail: `${health.unknown} unknown` },
    { label: "Connection alerts", value: connectionAlerts.length, href: "/command-center/settings/integrations" },
  ];

  return (
    <div>
      <PageHeader eyebrow="SNG LABS · Internal" title="Marketing Command Center" description="Decisions and actions for this week across the SNG portfolio. Humans set strategy and approve what reaches the public. Times shown in Central (CT).">
        <div className="rounded-full border border-[#b8d4c8]/20 bg-[#b8d4c8]/8 px-3 py-1.5 text-xs font-medium text-[#b8d4c8]">Approval mode · Manual</div>
      </PageHeader>

      <section className={`mt-8 ${card}`}>
        <SectionHeader index={1} title="This Week" detail="Up to three operator-prioritized actions." href="/command-center/growth" linkLabel="All actions" />
        {topActions.length ? <ol className="mt-5 grid gap-3 lg:grid-cols-3">{topActions.map((action) => <li key={action.id} className="rounded-xl border border-white/8 bg-white/[.02] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-white">{action.title}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#b8d4c8]">P{action.operatorPriority}</span></div><p className="mt-2 text-xs text-[#8f9391]">{action.owner?.name || action.owner?.email || "Unassigned"} · {action.dueAt ? `due ${formatCentralDate(action.dueAt)}` : "no deadline"}{action.status !== "OPEN" ? ` · ${action.status.replaceAll("_", " ")}` : ""}</p>{action.rationale && <p className="mt-2 text-xs leading-5 text-[#b8bcba]"><span className="text-[#747976]">Why: </span>{action.rationale}</p>}{action.evidence && <p className="mt-1 text-xs leading-5 text-[#8f9391]"><span className="text-[#747976]">Evidence: </span>{action.evidence}</p>}<p className="mt-2 text-[11px] text-[#666b68]">{[action.brand?.name, action.campaign?.name, action.relationship?.organization.name].filter(Boolean).join(" · ")}</p></li>)}</ol>
          : <Empty>No prioritized actions yet. {editable ? <><Link href="/command-center/growth" className="text-[#b8d4c8]">Add up to three actions on Growth</Link> and give each a priority number; only operator-selected actions appear here.</> : "An editor sets this week’s priorities on Growth."}{!currentPriorities && " No portfolio allocations are set either — start there."}</Empty>}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className={card}>
          <SectionHeader index={2} title="Decisions Needed" detail={decisionCount ? `${decisionCount} waiting on a human decision` : "Nothing waiting."} />
          {decisionCount ? <ul className="mt-5 space-y-2 text-sm">
            {approvals > 0 && <li><Link href="/command-center/queue" className="flex justify-between rounded-xl border border-white/7 p-3 text-white"><span>Content drafts need approval</span><span className="text-xs text-[#f0bd65]">{approvals}</span></Link></li>}
            {draftBriefs.map((brief) => <li key={brief.id}><Link href={`/command-center/brands/${brief.brandId}/growth?brief=${brief.id}`} className="flex justify-between rounded-xl border border-white/7 p-3 text-white"><span>{brief.brand.name} draft brief r{brief.revision}</span><span className="text-xs text-[#f0bd65]">Approve or revise</span></Link></li>)}
            {briefReviews.map((brief) => <li key={brief.id}><Link href={`/command-center/brands/${brief.brandId}/growth`} className="flex justify-between rounded-xl border border-white/7 p-3 text-white"><span>{brief.brand.name} brief review</span><span className={`text-xs ${brief.reviewAt && brief.reviewAt < now ? "text-[#ec7f72]" : "text-[#f0bd65]"}`}>{formatCentralDate(brief.reviewAt)}</span></Link></li>)}
            {priorityReviews.map((row) => <li key={row.id}><Link href="/command-center/growth" className="flex justify-between rounded-xl border border-white/7 p-3 text-white"><span>{row.brand.name} allocation review</span><span className={`text-xs ${row.reviewAt && row.reviewAt < now ? "text-[#ec7f72]" : "text-[#f0bd65]"}`}>{formatCentralDate(row.reviewAt)}</span></Link></li>)}
            {reviewsDue.map((campaign) => <li key={campaign.id}><Link href={`/command-center/campaigns/${campaign.id}#decisions`} className="flex justify-between rounded-xl border border-white/7 p-3 text-white"><span>{campaign.name}: continue / expand / revise / stop</span><span className="text-xs text-[#f0bd65]">ends {formatCalendarDay(campaign.endsAt, "—")}</span></Link></li>)}
          </ul> : <Empty>No approvals, brief reviews, allocation reviews or campaign decisions are due in the next 7 days.</Empty>}
        </article>

        <article className={card}>
          <SectionHeader index={3} title="Campaign Progress" detail="Reviewed actuals against targets on active campaigns." href="/command-center/scorecards" linkLabel="Scorecards" />
          {progress.length ? <ul className="mt-5 space-y-2">{progress.slice(0, 6).map((row) => <li key={row.id}><Link href={`/command-center/campaigns/${row.campaignId}`} className="block rounded-xl border border-white/7 p-3"><div className="flex justify-between gap-3 text-sm"><span className="text-white">{row.campaignName}</span><span><span className={row.actual.status === "UNKNOWN" ? "text-[#a6a9ff]" : "text-white"}>{formatMetricValue(row.actual.value, row.definition.unit)}</span><span className="text-[#747976]"> / {formatMetricValue(row.targetValue, row.definition.unit)}</span></span></div><p className="mt-1 text-xs text-[#8f9391]">{row.definition.label} (v{row.definition.version}){row.activationName ? ` · ${row.activationName}` : ""} · {formatCentralDate(row.periodStart)} – {formatCentralDate(exclusiveEndToInclusive(row.periodEnd))}</p><p className={`mt-1 text-[11px] ${row.stale ? "text-[#ec7f72]" : "text-[#666b68]"}`}>{row.actual.asOfAt ? `${row.stale ? "Stale · " : ""}as of ${formatCentralDateTime(row.actual.asOfAt)}` : "No reviewed measurement yet"}{row.actual.pendingReview ? ` · ${row.actual.pendingReview} awaiting review` : ""}</p></Link></li>)}</ul>
            : <Empty>No targets on active campaigns. Activating a campaign requires at least one numeric target; define metrics on <Link href="/command-center/scorecards" className="text-[#b8d4c8]">Scorecards</Link>.</Empty>}
        </article>
      </section>

      <section className={`mt-6 ${card}`}>
        <SectionHeader index={4} title="Relationship Next Steps" detail={`Operating rules: due within ${relationshipOperatingRules.dueWithinDays} days, stalled after ${relationshipOperatingRules.stalledAfterDays} days without activity, responses from the last ${relationshipOperatingRules.recentResponseDays} days. Rules, not a read on prospect interest.`} href={`/command-center/relationships?view=${relView}`} linkLabel="Open relationships" />
        <nav className="mt-5 flex flex-wrap gap-2">{viewOrder.map((key) => <Link key={key} href={`/command-center?rel=${key}`} scroll={false} className={`rounded-full border px-3 py-1.5 text-xs ${key === relView ? "border-[#b8d4c8]/40 bg-[#b8d4c8]/10 text-white" : "border-white/10 text-[#8f9391]"}`}>{relationshipViewLabels[key]} · {relationships.views[key].length}</Link>)}</nav>
        {relRows.length ? <ul className="mt-4 grid gap-2 lg:grid-cols-2">{relRows.map((row) => <li key={row.id}><Link href={`/command-center/relationships/${row.id}`} className="block rounded-xl border border-white/7 p-3"><div className="flex justify-between gap-3 text-sm"><span className="text-white">{row.organization.name}</span><span className={`text-xs ${relView === "overdue" ? "text-[#ec7f72]" : "text-[#8f9391]"}`}>{row.nextFollowUpAt ? formatCentralDate(row.nextFollowUpAt) : "no date"}</span></div><p className={`mt-1 text-xs ${row.nextAction ? "text-[#b8bcba]" : "text-[#f0bd65]"}`}>{row.nextAction || "No next action recorded"}</p><p className="mt-1 text-[11px] text-[#666b68]">{row.owner?.name || row.owner?.email || "Unowned"} · {row.stage.replaceAll("_", " ")}{row.lastInboundAt ? ` · last response ${formatCentralDate(row.lastInboundAt)}` : ""}</p></Link></li>)}</ul>
          : <Empty>{relationships.rows.length ? `Nothing in ${relationshipViewLabels[relView]}.` : <>No active relationships. <Link href="/command-center/relationships" className="text-[#b8d4c8]">Add an organization relationship</Link> to track outreach.</>}</Empty>}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className={card}>
          <SectionHeader index={5} title="Blockers" detail="Blocked actions and distribution readiness for active campaigns." />
          {blockedActions.length || readinessGaps.size ? <ul className="mt-5 space-y-2 text-sm">
            {blockedActions.map((action) => <li key={action.id} className="rounded-xl border border-[#ec7f72]/20 p-3"><p className="text-white">{action.title}</p><p className="mt-1 text-xs text-[#f0a49a]">{action.blocker}</p><p className="mt-1 text-[11px] text-[#666b68]">{action.owner?.name || action.owner?.email || "Unassigned"}{action.brand ? ` · ${action.brand.name}` : ""}</p></li>)}
            {[...readinessGaps.entries()].map(([brandId, gap]) => <li key={brandId}><Link href={`/command-center/brands/${brandId}`} className="block rounded-xl border border-[#f0bd65]/20 p-3"><p className="text-white">{gap.brand}: no verified or connected destination</p><p className="mt-1 text-xs text-[#8f9391]">Active: {gap.campaigns.join(", ")}. Verify an account identity for manual publishing.</p></Link></li>)}
          </ul> : <Empty>No blocked actions, and every brand on an active campaign has a verified or connected destination.</Empty>}
        </article>

        <article className={card}>
          <SectionHeader index={6} title="Upcoming & Open Opportunities" detail="Next 7 days of events and actionable signals." href="/command-center/today" linkLabel="Today" />
          <div className="mt-5 space-y-2">{upcomingEvents.map((event) => <Link key={event.id} href={`/command-center/sports-intelligence/events/${event.id}`} className="flex justify-between gap-3 rounded-xl border border-white/7 p-3 text-sm"><span className="text-white">{event.name}</span><span className="shrink-0 text-xs text-[#8f9391]">{formatCentralDateTime(event.startsAt)}{event.market ? ` · ${event.market.name}` : ""}</span></Link>)}{!upcomingEvents.length && <p className="text-sm text-[#777b78]">No events in the next 7 days.</p>}</div>
          <div className="mt-4 space-y-2">{openOpportunities.map((item) => <Link key={item.id} href="/command-center/opportunities" className="block rounded-xl border border-white/7 bg-white/[.02] p-3"><div className="flex justify-between gap-4"><p className="text-sm text-white">{item.title}</p><span className="text-xs text-[#b8d4c8]">{item.urgency}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#727674]">{item.summary}</p></Link>)}{!openOpportunities.length && <p className="text-sm text-[#777b78]">No open opportunities.</p>}</div>
        </article>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">{counts.map((item) => <Link key={item.label} href={item.href} className="rounded-xl border border-white/8 bg-[#101214] px-4 py-3"><p className="text-[11px] text-[#8c908e]">{item.label}</p><p className="mt-1 font-display text-xl font-semibold text-white">{item.value}{item.detail && <span className="ml-2 text-[11px] font-normal text-[#747976]">{item.detail}</span>}</p></Link>)}</section>
      <p className="mt-2 text-[11px] text-[#5f6461]">Account health uses each account’s latest editorial/distribution snapshot ({health.healthy} healthy, {health.watch} watch, {health.atRisk} at risk, {health.unknown} unknown). Connection alerts are separate API authorization observations.</p>

      <section className={`mt-8 ${card}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-lg font-semibold text-white">Portfolio brands</h2><p className="mt-1 text-xs text-[#7f8381]">{brandDefinitions.length} voices. One internal operating system.</p></div><Link href="/command-center/brands" className="text-xs font-medium text-[#b8d4c8] hover:text-white">View brand profiles →</Link></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{brandDefinitions.map((brand) => <div key={brand.key} className="rounded-xl border border-white/7 bg-white/[0.02] p-4"><span className="block h-1 w-8 rounded-full" style={{ backgroundColor: brand.accent }} /><p className="mt-4 text-sm font-semibold text-white">{brand.shortName}</p><p className="mt-1 text-[11px] text-[#777b78]">{brand.kind === "CORPORATE" ? "Studio voice" : "Product voice"}</p></div>)}</div>
      </section>
    </div>
  );
}
