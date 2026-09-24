"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCommandCenterUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { recommendationAcceptanceDecision } from "./acceptance";
import { evaluateSportsWindow } from "@/lib/sports-intelligence/evaluation";

async function requireEditor() {
  const user = await requireCommandCenterUser();
  if (!new Set(["OWNER", "ADMIN", "EDITOR"]).has(user.role)) throw new Error("Forbidden");
  return user;
}

function priorityScore(priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") {
  return { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 95 }[priority];
}

export async function evaluateNflWeekAction(formData: FormData) {
  const user = await requireEditor();
  const input = z.object({ season: z.coerce.number().int().min(2020).max(2100), week: z.coerce.number().int().min(1).max(22) }).parse({ season: formData.get("season"), week: formData.get("week") });
  const result = await evaluateSportsWindow(prisma, { leagueCode: "NFL", seasonYear: input.season, week: input.week });
  await prisma.auditEvent.create({ data: { actorId: user.id, action: "game_day.evaluate", entityType: "NFLWeek", entityId: `${input.season}-${input.week}`, metadata: result } });
  revalidatePath("/command-center/live-desk");
  redirect(`/command-center/live-desk?league=NFL&season=${input.season}&week=${input.week}`);
}

export async function skipRecommendation(recommendationId: string) {
  const user = await requireEditor();
  await prisma.opportunityRecommendation.update({ where: { id: recommendationId }, data: { reviewStatus: "SKIPPED", reviewedById: user.id, reviewedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorId: user.id, action: "game_day.recommendation.skip", entityType: "OpportunityRecommendation", entityId: recommendationId } });
  revalidatePath("/command-center/live-desk");
}

export async function dismissRecommendation(recommendationId: string) {
  const user = await requireEditor();
  await prisma.opportunityRecommendation.update({ where: { id: recommendationId }, data: { reviewStatus: "DISMISSED", reviewedById: user.id, reviewedAt: new Date() } });
  await prisma.auditEvent.create({ data: { actorId: user.id, action: "game_day.recommendation.dismiss", entityType: "OpportunityRecommendation", entityId: recommendationId } });
  revalidatePath("/command-center/live-desk");
}

async function acceptInTransaction(recommendationId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const recommendation = await tx.opportunityRecommendation.findUnique({
      where: { id: recommendationId },
      include: {
        brand: { select: { id: true, name: true } },
        event: { include: { market: true, homeTeam: true, awayTeam: true, venue: true } },
        campaign: true,
        activation: { include: { campaign: true, market: true, team: true } },
        acceptedOpportunity: { select: { id: true } },
      },
    });
    if (!recommendation) throw new Error("Recommendation not found");
    const decision = recommendationAcceptanceDecision({ outcome: recommendation.outcome, acceptedOpportunityId: recommendation.acceptedOpportunityId });
    if (decision.kind === "EXISTING") return { opportunityId: decision.opportunityId, brandId: recommendation.brandId };
    if (decision.kind === "REJECT") throw new Error(decision.reason);

    const event = recommendation.event;
    const activation = recommendation.activation;
    const campaign = recommendation.campaign ?? activation?.campaign ?? null;
    const marketIds = [...new Set([event?.marketId, activation?.marketId].filter((id): id is string => Boolean(id)))];
    const teamIds = [...new Set([event?.homeTeamId, event?.awayTeamId, activation?.teamId].filter((id): id is string => Boolean(id)))];
    const titleContext = event ? `${event.awayTeam?.name ?? "Away"} at ${event.homeTeam?.name ?? event.venue?.name ?? "NFL event"}` : campaign?.name ?? `NFL Week ${String((recommendation.contextSnapshot as Record<string, unknown>).week ?? "")}`.trim();
    const opportunity = await tx.opportunity.create({
      data: {
        eventId: event?.id ?? null,
        activationId: activation?.id ?? null,
        title: `${recommendation.brand.name}: ${titleContext}`,
        summary: recommendation.reason,
        whyItMatters: `The Game-Day Engine identified this ${recommendation.scope.toLowerCase()} as relevant to ${recommendation.brand.name}.`,
        status: "NEW",
        urgency: priorityScore(recommendation.priority),
        recommendedAt: new Date(),
        sourceLabel: "Game-Day Engine",
        actionRecommendation: `Review the trusted event context and develop a distinct ${recommendation.brand.name} execution if the recommendation remains strategically sound.`,
        markets: { connect: marketIds.map((id) => ({ id })) },
        teams: { connect: teamIds.map((id) => ({ id })) },
        campaigns: campaign ? { create: [{ campaignId: campaign.id }] } : undefined,
      },
    });
    await tx.opportunityRecommendation.update({ where: { id: recommendation.id }, data: { acceptedOpportunityId: opportunity.id, reviewStatus: "ACCEPTED", reviewedById: userId, reviewedAt: new Date() } });
    await tx.auditEvent.create({ data: { actorId: userId, action: "game_day.recommendation.accept", entityType: "OpportunityRecommendation", entityId: recommendation.id, metadata: { opportunityId: opportunity.id, brandId: recommendation.brandId } } });
    return { opportunityId: opportunity.id, brandId: recommendation.brandId };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function acceptRecommendation(recommendationId: string) {
  const user = await requireEditor();
  let accepted: { opportunityId: string; brandId: string } | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      accepted = await acceptInTransaction(recommendationId, user.id);
      break;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === 2) throw error;
    }
  }
  if (!accepted) throw new Error("Could not accept recommendation");
  revalidatePath("/command-center/live-desk");
  revalidatePath("/command-center/opportunities");
  redirect(`/command-center/ai-lab?opportunity=${accepted.opportunityId}&brand=${accepted.brandId}`);
}
