import { describe, expect, it } from "vitest";
import { addCentralDays, centralDayKey, formatCentralDateTime, isValidCalendarDate, parseCentralInput, startOfCentralDay, toCentralInputValue } from "./time";

describe("America/Chicago time helpers", () => {
  it("interprets date-only and datetime-local input as Central wall time", () => {
    expect(parseCentralInput("2026-09-30")?.toISOString()).toBe("2026-09-30T05:00:00.000Z");
    expect(parseCentralInput("2026-12-15T09:30")?.toISOString()).toBe("2026-12-15T15:30:00.000Z");
  });

  it("handles DST transitions", () => {
    expect(parseCentralInput("2026-03-08T03:30")?.toISOString()).toBe("2026-03-08T08:30:00.000Z");
    expect(parseCentralInput("2026-11-01T12:00")?.toISOString()).toBe("2026-11-01T18:00:00.000Z");
  });

  it("rejects impossible calendar dates instead of rolling them over", () => {
    expect(isValidCalendarDate(2026, 2, 29)).toBe(false);
    expect(isValidCalendarDate(2028, 2, 29)).toBe(true);
    expect(() => parseCentralInput("2026-02-30")).toThrow("Invalid calendar date");
    expect(() => parseCentralInput("2026-13-01T10:00")).toThrow("Invalid calendar date");
    expect(() => parseCentralInput("next tuesday")).toThrow("Invalid date");
  });

  it("returns null for blank input and accepts explicit ISO instants", () => {
    expect(parseCentralInput("")).toBeNull();
    expect(parseCentralInput(null)).toBeNull();
    expect(parseCentralInput("2026-09-30T12:00:00.000Z")?.toISOString()).toBe("2026-09-30T12:00:00.000Z");
  });

  it("uses Central day boundaries late at night UTC", () => {
    const lateCentral = new Date("2026-10-01T04:30:00.000Z");
    expect(centralDayKey(lateCentral)).toBe("2026-09-30");
    expect(startOfCentralDay(lateCentral).toISOString()).toBe("2026-09-30T05:00:00.000Z");
    expect(centralDayKey(addCentralDays(lateCentral, 1))).toBe("2026-10-01");
  });

  it("formats with an explicit CT label and round-trips input values", () => {
    const instant = new Date("2026-09-30T20:15:00.000Z");
    expect(formatCentralDateTime(instant)).toContain("CT");
    expect(toCentralInputValue(instant)).toBe("2026-09-30T15:15");
    expect(parseCentralInput(toCentralInputValue(instant))?.toISOString()).toBe(instant.toISOString());
  });
});
