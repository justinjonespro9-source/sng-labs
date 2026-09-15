import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivationForm } from "@/components/command-center/activation-form";
import { createActivation } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

export default async function NewActivationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [campaign, markets, teams, events, brands, relationships] = await Promise.all([prisma.campaign.findUnique({ where: { id } }), prisma.market.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.growthEvent.findMany({ orderBy: { startsAt: "asc" } }), prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.relationship.findMany({ include: { organization: true }, orderBy: { updatedAt: "desc" } })]);
  if (!campaign) notFound();
  return <div><Link href={`/command-center/campaigns/${id}`} className="text-xs text-[#b8d4c8]">← {campaign.name}</Link><h1 className="mt-5 font-display text-3xl text-white">Create Activation</h1><p className="mt-2 text-sm text-[#8f9391]">Define one market/team/event or audience/sport/week execution—not another campaign.</p><div className="mt-6"><ActivationForm action={createActivation.bind(null, id)} markets={markets} teams={teams} events={events} brands={brands} relationships={relationships.map((item) => ({ id: item.id, name: `${item.organization.name} · ${item.name}` }))} /></div></div>;
}
