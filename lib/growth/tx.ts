import { Prisma, type PrismaClient } from "@prisma/client";

/** Serialization failures surface as P2034, or as P2010/40001 when raised by a raw locking query. P2002 covers losing a partial-unique race. */
export function isRetryableTransactionError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034" || error.code === "P2002") return true;
  return error.code === "P2010" && /40001|could not serialize/i.test(`${JSON.stringify(error.meta ?? {})} ${error.message}`);
}

export async function withSerializableRetry<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable" });
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt >= attempts) throw error;
    }
  }
}
