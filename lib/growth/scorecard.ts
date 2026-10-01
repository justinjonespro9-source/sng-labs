import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStale, reviewedActual, type Actual, type MeasurementRow, type MetricAggregation, type MetricUnit } from "./measurements";

const num = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));

export type TargetProgress = {
  id: string;
  campaignId: string;
  campaignName: string;
  brandName: string;
  activationName: string | null;
  definition: { id: string; key: string; version: number; label: string; unit: MetricUnit; aggregation: MetricAggregation; freshnessDays: number | null };
  targetValue: number;
  baselineValue: number | null;
  periodStart: Date;
  periodEnd: Date;
  dueAt: Date | null;
  actual: Actual;
  stale: boolean;
};

/** Campaign targets compared only with reviewed measurements attributed to the same campaign and the same activation slice (campaign-level targets use campaign-level rows), so slices are never double-counted. */
export async function loadTargetProgress(where: Prisma.CampaignTargetWhereInput, now = new Date()): Promise<TargetProgress[]> {
  const targets = await prisma.campaignTarget.findMany({ where, include: { campaign: { select: { name: true } }, brand: { select: { name: true } }, activation: { select: { name: true } }, metricDefinition: true }, orderBy: [{ periodEnd: "asc" }, { createdAt: "asc" }] });
  if (!targets.length) return [];
  const measurements = await prisma.growthMeasurement.findMany({
    where: { OR: targets.map((target) => ({ definitionId: target.metricDefinitionId, campaignId: target.campaignId, periodStart: { gte: target.periodStart }, periodEnd: { lte: target.periodEnd } })) },
    select: { id: true, definitionId: true, campaignId: true, activationId: true, periodStart: true, periodEnd: true, value: true, numerator: true, denominator: true, status: true, asOfAt: true, scope: true, cohortKey: true, supersedesId: true },
  });
  return targets.map((target) => {
    const rows: MeasurementRow[] = measurements
      .filter((row) => row.definitionId === target.metricDefinitionId && row.campaignId === target.campaignId && row.activationId === target.activationId)
      .map((row) => ({ ...row, value: num(row.value), numerator: num(row.numerator), denominator: num(row.denominator) }));
    const definition = target.metricDefinition;
    const actual = reviewedActual(definition, rows, { start: target.periodStart, end: target.periodEnd });
    return {
      id: target.id, campaignId: target.campaignId, campaignName: target.campaign.name, brandName: target.brand.name, activationName: target.activation?.name ?? null,
      definition: { id: definition.id, key: definition.key, version: definition.version, label: definition.label, unit: definition.unit, aggregation: definition.aggregation, freshnessDays: definition.freshnessDays },
      targetValue: Number(target.targetValue), baselineValue: num(target.baselineValue), periodStart: target.periodStart, periodEnd: target.periodEnd, dueAt: target.dueAt,
      actual, stale: isStale(actual.asOfAt, definition.freshnessDays, now),
    };
  });
}
