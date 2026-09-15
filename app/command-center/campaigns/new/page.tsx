import Link from "next/link";
import { CampaignForm } from "@/components/command-center/campaign-form";
import { createCampaign } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

export default async function NewCampaignPage() {
  const [programs, brands, markets, teams] = await Promise.all([prisma.growthProgram.findMany({ orderBy: { name: "asc" } }), prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.market.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } })]);
  return <div><Link href="/command-center/campaigns" className="text-xs text-[#b8d4c8]">← Campaigns</Link><h1 className="mt-5 font-display text-3xl text-white">Create Campaign</h1><p className="mt-2 text-sm text-[#8f9391]">Define the business outcome. Team, market, event, week, and slate execution belongs in Activations.</p><div className="mt-6"><CampaignForm action={createCampaign} programs={programs} brands={brands} markets={markets} teams={teams} /></div></div>;
}
