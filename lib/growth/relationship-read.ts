import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { groupRelationshipViews } from "./relationships";
import { normalizeCalendarDate } from "./time";

/** Relationships with derived operating timestamps from canonical activity history. */
export async function loadRelationshipOperatingRows(where: Prisma.RelationshipWhereInput = {}) {
  const relationships = await prisma.relationship.findMany({ where, include: { organization: { include: { market: true } }, contact: true, owner: true, relevantBrands: true, campaignLinks: { include: { campaign: { select: { id: true, name: true } } } } }, orderBy: { updatedAt: "desc" } });
  const ids = relationships.map((relationship) => relationship.id);
  const [lastActivity, lastInbound] = ids.length ? await Promise.all([
    prisma.relationshipActivity.groupBy({ by: ["relationshipId"], where: { relationshipId: { in: ids } }, _max: { occurredAt: true } }),
    prisma.relationshipActivity.groupBy({ by: ["relationshipId"], where: { relationshipId: { in: ids }, direction: "INBOUND" }, _max: { occurredAt: true } }),
  ]) : [[], []];
  const activityMap = new Map(lastActivity.map((row) => [row.relationshipId, row._max.occurredAt]));
  const inboundMap = new Map(lastInbound.map((row) => [row.relationshipId, row._max.occurredAt]));
  return relationships.map((relationship) => ({ ...relationship, nextFollowUpAt: normalizeCalendarDate(relationship.nextFollowUpAt), lastActivityAt: activityMap.get(relationship.id) ?? null, lastInboundAt: inboundMap.get(relationship.id) ?? null }));
}

export type RelationshipOperatingRecord = Awaited<ReturnType<typeof loadRelationshipOperatingRows>>[number];

export async function loadRelationshipViews(where: Prisma.RelationshipWhereInput = {}, now = new Date()) {
  const rows = await loadRelationshipOperatingRows(where);
  return { rows, views: groupRelationshipViews(rows, now) };
}
