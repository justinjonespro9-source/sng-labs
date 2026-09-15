import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivationForm } from "@/components/command-center/activation-form";
import { updateActivation } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

export default async function EditActivationPage({ params }: { params: Promise<{ id: string; activationId: string }> }) {
  const { id, activationId } = await params;
  const [activation, markets, teams, events, brands, relationships] = await Promise.all([prisma.campaignActivation.findFirst({ where: { id: activationId, campaignId: id }, include: { brands: true, relationships: true } }), prisma.market.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.growthEvent.findMany({ orderBy: { startsAt: "asc" } }), prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.relationship.findMany({ include: { organization: true }, orderBy: { updatedAt: "desc" } })]);
  if (!activation) notFound();
  return <div><Link href={`/command-center/campaigns/${id}/activations/${activationId}`} className="text-xs text-[#b8d4c8]">← Activation</Link><h1 className="mt-5 font-display text-3xl text-white">Edit Activation</h1><div className="mt-6"><ActivationForm action={updateActivation.bind(null, activationId)} markets={markets} teams={teams} events={events} brands={brands} relationships={relationships.map((item) => ({ id: item.id, name: `${item.organization.name} · ${item.name}` }))} activation={activation} /></div></div>;
}
