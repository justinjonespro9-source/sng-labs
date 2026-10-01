export const CENTRAL_TIME_ZONE = "America/Chicago";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CENTRAL_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function centralParts(date: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

function centralOffsetMs(instant: number) {
  const parts = centralParts(new Date(instant));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

export function isValidCalendarDate(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function centralWallTimeToDate(year: number, month: number, day: number, hour = 0, minute = 0) {
  if (!isValidCalendarDate(year, month, day) || hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("Invalid calendar date");
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let instant = guess - centralOffsetMs(guess);
  const corrected = guess - centralOffsetMs(instant);
  if (corrected !== instant) instant = corrected;
  return new Date(instant);
}

const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
const dateTimeLocal = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

/** Parses form input as America/Chicago wall time. Rejects impossible dates such as 2026-02-30 instead of rolling them over. */
export function parseCentralInput(raw: FormDataEntryValue | string | null | undefined): Date | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const dateMatch = dateOnly.exec(value);
  if (dateMatch) return centralWallTimeToDate(Number(dateMatch[1]), Number(dateMatch[2]), Number(dateMatch[3]));
  const dateTimeMatch = dateTimeLocal.exec(value);
  if (dateTimeMatch) return centralWallTimeToDate(Number(dateTimeMatch[1]), Number(dateTimeMatch[2]), Number(dateTimeMatch[3]), Number(dateTimeMatch[4]), Number(dateTimeMatch[5]));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) throw new Error("Invalid date");
  return parsed;
}

export function centralDayKey(date: Date) {
  const parts = centralParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function startOfCentralDay(date: Date) {
  const parts = centralParts(date);
  return centralWallTimeToDate(parts.year, parts.month, parts.day);
}

export function addCentralDays(date: Date, days: number) {
  const parts = centralParts(date);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return centralWallTimeToDate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate(), parts.hour, parts.minute);
}

export function formatCentralDate(date: Date | null | undefined) {
  if (!date) return "—";
  return `${new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_TIME_ZONE, month: "short", day: "numeric", year: "numeric" }).format(date)} CT`;
}

export function formatCentralDateTime(date: Date | null | undefined) {
  if (!date) return "—";
  return `${new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_TIME_ZONE, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date)} CT`;
}

/** Maps a legacy UTC-midnight date-only value to Central midnight of the same calendar day; other instants are unchanged. */
export function normalizeCalendarDate(date: Date | null) {
  if (!date) return null;
  const key = calendarDayKey(date);
  if (key === centralDayKey(date)) return date;
  const [year, month, day] = key.split("-").map(Number);
  return centralWallTimeToDate(year, month, day);
}

export function formatCalendarDay(date: Date | null | undefined, fallback = "—") {
  const key = calendarDayKey(date);
  if (!key) return fallback;
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function toCentralInputValue(date: Date | null | undefined) {
  if (!date) return "";
  const parts = centralParts(date);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function toCentralDateInputValue(date: Date | null | undefined) {
  return date ? centralDayKey(date) : "";
}

/**
 * Calendar day for date-only fields. Legacy rows were stored as UTC midnight from `new Date("YYYY-MM-DD")`;
 * Central midnight is never 00:00 UTC, so those rows keep their original calendar date.
 */
export function calendarDayKey(date: Date | null | undefined) {
  if (!date) return "";
  const legacyUtcMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
  return legacyUtcMidnight ? date.toISOString().slice(0, 10) : centralDayKey(date);
}
