import { createHash } from "node:crypto";

export const SERIALIZATION_VERSION = "sng-canonical-json/1";
/** Separate from legacy fingerprints: keys use UTF-16 lexical order, arrays have contract order. */
export function canonicalExportJson(value: unknown): string {
  function normalize(item: unknown): unknown {
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isSafeInteger(item)) return item;
    if (Array.isArray(item)) return item.map(normalize);
    if (item && Object.getPrototypeOf(item) === Object.prototype) {
      return Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize((item as Record<string, unknown>)[key])]));
    }
    throw new Error("Canonical JSON requires plain objects, explicit nulls and safe integers");
  }
  return JSON.stringify(normalize(value));
}
export function exportChecksum(value: unknown): string {
  return createHash("sha256").update(canonicalExportJson(value), "utf8").digest("hex");
}
