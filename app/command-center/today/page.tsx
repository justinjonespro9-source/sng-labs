import Link from "next/link";
import { PageHeader } from "@/components/command-center/page-header";
import { getTodayReadModel, type CommandCenterLens } from "@/lib/command-center/today";
import { prisma } from "@/lib/prisma";

const lenses: CommandCenterLens[] = ["PORTFOLIO", "SPORTS", "MARKETS", "DISTRIBUTION"];

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ lens?: string; date?: string }> }) {
  const filters = await searchParams;
  const lens = lenses.includes(filters.lens as CommandCenterLens) ? filters.lens as CommandCenterLens : undefined;
  const from = filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date) ? new Date(`${filters.date}T00:00:00.000Z`) : new Date();
  const to = new Date(from.getTime() + 14 * 86_400_000);
  const all = await getTodayReadModel(prisma, { from, to });
  const items = lens ? all.filter((item) => item.lenses.includes(lens)) : all;
  return <div><PageHeader title="Today" description="One time-ordered operating view across portfolio work, canonical sports events, markets, and distribution." />
    <div className="mt-6 flex flex-wrap gap-2"><Link href="/command-center/today" className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white">All</Link>{lenses.map((item) => <Link key={item} href={`/command-center/today?lens=${item}`} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-[#b8d4c8]">{item[0] + item.slice(1).toLowerCase()}</Link>)}</div>
    <section className="mt-7 space-y-3">{items.map((item) => <Link href={item.href} key={item.id} className="grid gap-3 rounded-2xl border border-white/8 bg-[#101214] p-5 sm:grid-cols-[12rem_1fr_auto]"><div><p className="text-xs text-[#b8d4c8]">{new Date(item.startsAt).toLocaleString()}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#717572]">{item.sourceType.replaceAll("_", " ")}</p></div><div><p className="text-sm font-medium text-white">{item.title}</p><p className="mt-1 text-xs text-[#777b78]">{[item.league, item.market].filter(Boolean).join(" · ") || item.lenses.join(" · ")}</p></div><span className="text-xs text-[#8f9391]">{item.status.replaceAll("_", " ")}</span></Link>)}{!items.length && <p className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-[#8f9391]">No items in this 14-day operating window.</p>}</section>
  </div>;
}
