import { PrismaClient } from "@prisma/client";

const EXPECTED_PREVIEW_HOST = "ep-cold-sun-b580ukxa-pooler.c-7.us-east-2.aws.neon.tech";
const BLOCKED_PRODUCTION_HOST_FRAGMENT = "ep-snowy-star-awqzs6ol";
const EXPECTED_RUN_ID = "cmu98vhx30001ku83islbrude";
const EXPECTED_CREATED_COUNT = 1059;

function assertPreviewDatabase() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  const hostname = new URL(value).hostname;
  if (hostname.includes(BLOCKED_PRODUCTION_HOST_FRAGMENT)) {
    throw new Error("STOP: Production database detected");
  }
  if (hostname !== EXPECTED_PREVIEW_HOST) {
    throw new Error(`STOP: Expected Preview host ${EXPECTED_PREVIEW_HOST}; received ${hostname}`);
  }
  return hostname;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const prisma = new PrismaClient();
  const hostname = assertPreviewDatabase();

  try {
    const run = await prisma.sportsIngestionRun.findUnique({
      where: { id: EXPECTED_RUN_ID },
      include: {
        records: {
          where: { status: "CREATE", participantId: { not: null } },
          select: { id: true, participantId: true },
        },
      },
    });
    if (!run) throw new Error(`Import run ${EXPECTED_RUN_ID} was not found`);
    if (run.status !== "APPLIED") {
      throw new Error(`Expected APPLIED run; received ${run.status}`);
    }
    if (run.createdCount !== EXPECTED_CREATED_COUNT) {
      throw new Error(`Expected createdCount ${EXPECTED_CREATED_COUNT}; received ${run.createdCount}`);
    }

    const participantIds = [...new Set(run.records.flatMap((record) =>
      record.participantId ? [record.participantId] : [],
    ))];
    if (run.records.length !== EXPECTED_CREATED_COUNT || participantIds.length !== EXPECTED_CREATED_COUNT) {
      throw new Error(
        `Cleanup boundary mismatch: ${run.records.length} CREATE records / ${participantIds.length} unique participants`,
      );
    }

    const [participants, otherRunReferences, teamDefenses, memberships] = await Promise.all([
      prisma.sportsParticipant.count({ where: { id: { in: participantIds }, kind: "PLAYER" } }),
      prisma.sportsIngestionRecord.count({
        where: { participantId: { in: participantIds }, runId: { not: run.id } },
      }),
      prisma.teamDefense.count({ where: { participantId: { in: participantIds } } }),
      prisma.seasonRosterMembership.count({ where: { participantId: { in: participantIds } } }),
    ]);
    if (participants !== EXPECTED_CREATED_COUNT) {
      throw new Error(`Expected ${EXPECTED_CREATED_COUNT} PLAYER participants; received ${participants}`);
    }
    if (otherRunReferences !== 0) {
      throw new Error(`STOP: ${otherRunReferences} candidate references exist in other ingestion runs`);
    }
    if (teamDefenses !== 0) {
      throw new Error(`STOP: ${teamDefenses} candidate participants are linked to TeamDefense`);
    }

    const report = {
      mode: apply ? "APPLY" : "PREVIEW",
      hostname,
      runId: run.id,
      runStatusBefore: run.status,
      createRecords: run.records.length,
      participantsToDelete: participantIds.length,
      membershipsToDelete: memberships,
      otherRunReferences,
      matchedParticipantsPreserved: run.unchangedCount + run.updatedCount,
      ingestionRunPreserved: true,
    };
    console.log(JSON.stringify(report, null, 2));

    if (!apply) {
      console.log("No records changed. Re-run with --apply after reviewing this boundary.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.seasonRosterMembership.deleteMany({ where: { participantId: { in: participantIds } } });
      const deleted = await tx.sportsParticipant.deleteMany({ where: { id: { in: participantIds }, kind: "PLAYER" } });
      if (deleted.count !== EXPECTED_CREATED_COUNT) {
        throw new Error(`Delete count mismatch: expected ${EXPECTED_CREATED_COUNT}, received ${deleted.count}`);
      }
      await tx.sportsIngestionRun.update({
        where: { id: run.id },
        data: { status: "FAILED" },
      });
      await tx.auditEvent.create({
        data: {
          action: "SPORTS_ROSTER_IMPORT_ROLLED_BACK",
          entityType: "SportsIngestionRun",
          entityId: run.id,
          metadata: {
            reason: "RankEyeQ integration-test identities contaminated the source export",
            deletedParticipants: deleted.count,
            deletedMemberships: memberships,
            preservedMatchedParticipants: run.unchangedCount + run.updatedCount,
            originalAppliedAt: run.appliedAt?.toISOString() ?? null,
          },
        },
      });
    }, { maxWait: 30_000, timeout: 600_000 });

    console.log(JSON.stringify({ runId: run.id, status: "FAILED", deletedParticipants: EXPECTED_CREATED_COUNT }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
