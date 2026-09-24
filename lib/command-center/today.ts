import type { PrismaClient } from "@prisma/client";

export type CommandCenterLens = "PORTFOLIO" | "SPORTS" | "MARKETS" | "DISTRIBUTION";
export type TodayItem = {
  id: string;
  sourceType: "GROWTH_EVENT" | "ACTIVATION" | "CAMPAIGN" | "CONTENT_DRAFT" | "PUBLICATION" | "RELATIONSHIP_FOLLOW_UP";
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  status: string;
  href: string;
  lenses: CommandCenterLens[];
  market?: string;
  league?: string;
};

export function orderTodayItems(items: TodayItem[]) {
  return [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
}

export async function getTodayReadModel(prisma: PrismaClient, input: { from: Date; to: Date }): Promise<TodayItem[]> {
  const range = { gte: input.from, lt: input.to };
  const [events, activations, campaigns, drafts, publications, relationships] = await Promise.all([
    prisma.growthEvent.findMany({ where: { startsAt: range }, include: { market: true, canonicalLeague: true }, orderBy: { startsAt: "asc" } }),
    prisma.campaignActivation.findMany({ where: { startsAt: range }, include: { market: true, campaign: true }, orderBy: { startsAt: "asc" } }),
    prisma.campaign.findMany({ where: { startsAt: range }, orderBy: { startsAt: "asc" } }),
    prisma.contentDraft.findMany({ where: { scheduledFor: range }, include: { brandAngle: { include: { brand: true } } }, orderBy: { scheduledFor: "asc" } }),
    prisma.publication.findMany({ where: { scheduledFor: range }, include: { draft: { include: { brandAngle: { include: { brand: true } } } } }, orderBy: { scheduledFor: "asc" } }),
    prisma.relationship.findMany({ where: { nextFollowUpAt: range }, include: { organization: true }, orderBy: { nextFollowUpAt: "asc" } }),
  ]);
  return orderTodayItems([
    ...events.map((item): TodayItem => ({ id: `GROWTH_EVENT:${item.id}`, sourceType: "GROWTH_EVENT", sourceId: item.id, title: item.name, startsAt: item.startsAt.toISOString(), endsAt: item.endsAt?.toISOString(), status: item.status, href: `/command-center/sports-intelligence/events/${item.id}`, lenses: item.type === "GAME" ? ["SPORTS", "PORTFOLIO", ...(item.market ? ["MARKETS" as const] : [])] : ["PORTFOLIO"], market: item.market?.name, league: item.canonicalLeague?.code ?? item.league ?? undefined })),
    ...activations.filter((item) => item.startsAt).map((item): TodayItem => ({ id: `ACTIVATION:${item.id}`, sourceType: "ACTIVATION", sourceId: item.id, title: item.name, startsAt: item.startsAt!.toISOString(), endsAt: item.endsAt?.toISOString(), status: item.status, href: `/command-center/campaigns/${item.campaignId}`, lenses: ["PORTFOLIO", ...(item.market ? ["MARKETS" as const] : [])], market: item.market?.name })),
    ...campaigns.filter((item) => item.startsAt).map((item): TodayItem => ({ id: `CAMPAIGN:${item.id}`, sourceType: "CAMPAIGN", sourceId: item.id, title: item.name, startsAt: item.startsAt!.toISOString(), endsAt: item.endsAt?.toISOString(), status: item.status, href: `/command-center/campaigns/${item.id}`, lenses: ["PORTFOLIO"] })),
    ...drafts.filter((item) => item.scheduledFor).map((item): TodayItem => ({ id: `CONTENT_DRAFT:${item.id}`, sourceType: "CONTENT_DRAFT", sourceId: item.id, title: `${item.brandAngle.brand.name}: ${item.hook}`, startsAt: item.scheduledFor!.toISOString(), status: item.status, href: "/command-center/queue", lenses: ["DISTRIBUTION", "PORTFOLIO"] })),
    ...publications.filter((item) => item.scheduledFor).map((item): TodayItem => ({ id: `PUBLICATION:${item.id}`, sourceType: "PUBLICATION", sourceId: item.id, title: `${item.draft.brandAngle.brand.name} publication`, startsAt: item.scheduledFor!.toISOString(), status: item.status, href: "/command-center/queue", lenses: ["DISTRIBUTION", "PORTFOLIO"] })),
    ...relationships.filter((item) => item.nextFollowUpAt).map((item): TodayItem => ({ id: `RELATIONSHIP_FOLLOW_UP:${item.id}`, sourceType: "RELATIONSHIP_FOLLOW_UP", sourceId: item.id, title: `Follow up: ${item.organization.name}`, startsAt: item.nextFollowUpAt!.toISOString(), status: item.stage, href: `/command-center/relationships/${item.id}`, lenses: ["PORTFOLIO"] })),
  ]);
}
