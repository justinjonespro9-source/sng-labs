import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignForm } from "@/components/command-center/campaign-form";
import { FormNotice } from "@/components/command-center/form-notice";
import { updateCampaign } from "@/lib/command-center/actions";
import { prisma } from "@/lib/prisma";

export default async function EditCampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [campaign, programs, brands, markets, teams, users] = await Promise.all([prisma.campaign.findUnique({ where: { id }, include: { brands: true, markets: true, teams: true } }), prisma.growthProgram.findMany({ orderBy: { name: "asc" } }), prisma.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.market.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.team.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.user.findMany({ where: { role: { in: ["OWNER", "ADMIN", "EDITOR"] } }, select: { id: true, name: true, email: true }, orderBy: { email: "asc" } })]);
  if (!campaign) notFound();
  return <div><Link href={`/command-center/campaigns/${id}`} className="text-xs text-[#b8d4c8]">← Campaign</Link><h1 className="mt-5 font-display text-3xl text-white">Edit Campaign</h1><FormNotice error={error} /><div className="mt-6"><CampaignForm action={updateCampaign.bind(null, id)} programs={programs} brands={brands} markets={markets} teams={teams} users={users} campaign={campaign} /></div></div>;
}
