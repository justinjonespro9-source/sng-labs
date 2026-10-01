import { Prisma, type PrismaClient } from "@prisma/client";
import { normalizeMeasurement, overlappingSumPeriod, type DefinitionRef } from "./measurements";

export type RecordMeasurementInput = {
  definitionId: string;
  value: string | null;
  numerator: string | null;
  denominator: string | null;
  periodStart: Date;
  periodEnd: Date;
  asOfAt: Date;
  source: string;
  sourceUrl: string | null;
  campaignId: string | null;
  activationId: string | null;
  scope: string | null;
  cohortKey: string | null;
  externalKey: string | null;
  supersedesId: string | null;
  notes: string | null;
  actorId: string | null;
};

const decimal = (value: number | null) => (value === null ? null : new Prisma.Decimal(value));

export async function recordMeasurementTx(db: PrismaClient, input: RecordMeasurementInput, now = new Date()) {
  return db.$transaction(async (tx) => {
    const definition = await tx.growthMetricDefinition.findUnique({ where: { id: input.definitionId } });
    if (!definition) throw new Error("Metric definition not found");
    const campaign = input.campaignId ? await tx.campaign.findUnique({ where: { id: input.campaignId }, select: { id: true, brands: { select: { id: true } } } }) : null;
    if (input.campaignId && !campaign) throw new Error("Campaign not found");
    const activation = input.activationId ? await tx.campaignActivation.findUnique({ where: { id: input.activationId }, select: { id: true, campaignId: true, brands: { select: { id: true } } } }) : null;
    if (input.activationId && !activation) throw new Error("Activation not found");
    const supersedes = input.supersedesId ? await tx.growthMeasurement.findUnique({ where: { id: input.supersedesId }, select: { id: true, definitionId: true, supersededBy: { select: { id: true } } } }) : null;
    if (input.supersedesId) {
      if (!supersedes) throw new Error("The measurement being corrected was not found");
      if (supersedes.supersededBy) throw new Error("That measurement has already been corrected; correct the latest version instead");
      if (supersedes.definitionId !== definition.id) throw new Error("A correction must use the same metric definition version");
    }
    const ref: DefinitionRef = { id: definition.id, brandId: definition.brandId, unit: definition.unit, aggregation: definition.aggregation, status: definition.status, freshnessDays: definition.freshnessDays };
    const normalized = normalizeMeasurement({
      definition: ref, brandId: definition.brandId, value: input.value, numerator: input.numerator, denominator: input.denominator,
      periodStart: input.periodStart, periodEnd: input.periodEnd, asOfAt: input.asOfAt, source: input.source, sourceUrl: input.sourceUrl,
      campaign: campaign ? { id: campaign.id, brandIds: campaign.brands.map((brand) => brand.id) } : null,
      activation: activation ? { id: activation.id, campaignId: activation.campaignId, brandIds: activation.brands.map((brand) => brand.id) } : null,
    }, now);
    if (definition.aggregation === "SUM") {
      const existing = await tx.growthMeasurement.findMany({ where: { definitionId: definition.id, supersededBy: { is: null }, periodStart: { lt: input.periodEnd }, periodEnd: { gt: input.periodStart } }, select: { id: true, periodStart: true, periodEnd: true, scope: true, cohortKey: true, campaignId: true, activationId: true, supersedesId: true } });
      const overlap = overlappingSumPeriod(existing, { id: "candidate", periodStart: input.periodStart, periodEnd: input.periodEnd, scope: input.scope, cohortKey: input.cohortKey, campaignId: input.campaignId, activationId: input.activationId, supersedesId: input.supersedesId });
      if (overlap) throw new Error("This period overlaps an existing measurement for the same metric and slice. Record a correction instead so totals are not double-counted.");
    }
    const created = await tx.growthMeasurement.create({ data: {
      definitionId: definition.id, brandId: definition.brandId, periodStart: input.periodStart, periodEnd: input.periodEnd,
      value: decimal(normalized.value), numerator: decimal(normalized.numerator), denominator: decimal(normalized.denominator), status: normalized.status,
      source: input.source.trim(), sourceUrl: input.sourceUrl, asOfAt: input.asOfAt, enteredById: input.actorId, campaignId: input.campaignId, activationId: input.activationId,
      scope: input.scope, cohortKey: input.cohortKey, externalKey: input.externalKey, supersedesId: supersedes?.id ?? null,
      evidence: input.notes ? { notes: input.notes } : undefined,
    } });
    await tx.auditEvent.create({ data: { actorId: input.actorId, action: supersedes ? "growth_measurement.correct" : "growth_measurement.record", entityType: "GrowthMeasurement", entityId: created.id, metadata: { definitionId: definition.id, key: definition.key, version: definition.version, status: normalized.status, supersedesId: supersedes?.id ?? null } } });
    return created;
  }, { isolationLevel: "Serializable" });
}
