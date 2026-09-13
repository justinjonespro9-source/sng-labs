import Link from "next/link";
import { PageHeader } from "@/components/command-center/page-header";
import { brandDefinitions } from "@/lib/command-center/brand-definitions";
import { prisma } from "@/lib/prisma";

export default async function CommandCenterOverviewPage() {
  const [open, approvals, scheduled, watch, recent, followUps] = await Promise.all([
    prisma.opportunity.count({ where: { status: { in: ["NEW", "REVIEWED", "DEVELOPING", "QUEUED"] } } }),
    prisma.contentDraft.count({ where: { status: "NEEDS_REVIEW" } }),
    prisma.publication.count({ where: { status: { in: ["PLANNED", "READY"] } } }),
    prisma.accountHealthSnapshot.count({ where: { state: { in: ["WATCH", "RECOVERY"] } } }),
    prisma.opportunity.findMany({ orderBy: [{ urgency: "desc" }, { createdAt: "desc" }], take: 4 }),
    prisma.relationship.count({ where: { nextFollowUpAt: { lte: new Date() }, stage: { notIn: ["CLOSED", "NOT_PURSUING"] } } }),
  ]);
  const summaryCards = [
    { label: "Open opportunities", value: String(open), detail: "Signals needing a decision" },
    { label: "Needs approval", value: String(approvals), detail: "Human approval remains required" },
    { label: "Scheduled", value: String(scheduled), detail: "Approved publications queued" },
    { label: "Accounts on watch", value: String(watch), detail: "Health may limit distribution" },
  ];
  return (
    <div>
      <PageHeader
        eyebrow="SNG LABS · Internal"
        title="Marketing Command Center"
        description="One operating view across the SNG portfolio. AI finds and develops meaningful opportunities; SNG controls what reaches the public."
      >
        <div className="rounded-full border border-[#b8d4c8]/20 bg-[#b8d4c8]/8 px-3 py-1.5 text-xs font-medium text-[#b8d4c8]">
          Approval mode · Manual
        </div>
      </PageHeader>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-white/8 bg-[#101214] p-5">
            <p className="text-xs font-medium text-[#8c908e]">{card.label}</p>
            <p className="mt-4 font-display text-3xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-xs leading-5 text-[#707472]">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <article className="rounded-2xl border border-white/8 bg-[#101214] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Opportunity feed</h2>
              <p className="mt-1 text-xs text-[#7f8381]">Unified signals, distinct editorial angles.</p>
            </div>
            <Link href="/command-center/opportunities" className="text-xs text-[#b8d4c8]">Open feed →</Link>
          </div>
          <div className="mt-6 space-y-3">{recent.length ? recent.map((item) => <div key={item.id} className="rounded-xl border border-white/7 bg-white/[.02] p-4"><div className="flex justify-between gap-4"><p className="text-sm font-medium text-white">{item.title}</p><span className="text-xs text-[#b8d4c8]">{item.urgency}</span></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#727674]">{item.summary}</p></div>) : <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[#8f9391]">Ready for the first opportunity.</div>}</div>
        </article>

        <article className="rounded-2xl border border-white/8 bg-[#101214] p-6">
          <h2 className="font-display text-lg font-semibold text-white">Distribution posture</h2>
          <p className="mt-1 text-xs text-[#7f8381]">Account health gates volume and timing.</p>
          <div className="mt-6 space-y-3">
            {[
              ["Healthy", "Normal cadence", "#87d2ac"],
              ["Watch", "Post selectively", "#f0bd65"],
              ["Recovery", "High-confidence only", "#ec7f72"],
            ].map(([state, detail, color]) => (
              <div key={state} className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm text-white">{state}</span>
                </div>
                <span className="text-xs text-[#777b78]">{detail}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-white/8 bg-[#101214] p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="font-display text-lg font-semibold text-white">Relationship follow-ups</h2><p className="mt-1 text-xs text-[#7f8381]">{followUps} due or overdue</p></div><Link href="/command-center/relationships" className="text-xs text-[#b8d4c8]">Open pipeline →</Link></div></section>

      <section className="mt-8 rounded-2xl border border-white/8 bg-[#101214] p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Portfolio brands</h2>
            <p className="mt-1 text-xs text-[#7f8381]">Seven voices. One internal operating system.</p>
          </div>
          <Link href="/command-center/brands" className="text-xs font-medium text-[#b8d4c8] hover:text-white">View brand profiles →</Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {brandDefinitions.map((brand) => (
            <div key={brand.key} className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
              <span className="block h-1 w-8 rounded-full" style={{ backgroundColor: brand.accent }} />
              <p className="mt-4 text-sm font-semibold text-white">{brand.shortName}</p>
              <p className="mt-1 text-[11px] text-[#777b78]">{brand.kind === "CORPORATE" ? "Studio voice" : "Product voice"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
