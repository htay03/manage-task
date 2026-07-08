// JST (Japan Standard Time, UTC+9) date helpers, shared by the scheduler and
// the summary builder so the time logic lives in exactly one place.
//
// Trick used throughout: we shift a timestamp by +9h and then read it with the
// getUTC* accessors. That makes the "UTC" fields hold the JST wall-clock value,
// no matter what timezone the server runs in. Always use getUTC* on these Dates
// (never getHours()/getDay(), which depend on the machine's local timezone).

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Current wall-clock time in JST. Read its fields with getUTC*. */
export function nowJst(now: number = Date.now()): Date {
  return new Date(now + JST_OFFSET_MS);
}

/** "YYYY-M-D" key of a JST-shifted Date, for same-day (JST) comparisons. */
export function jstDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

/** Minutes since midnight for an "HH:MM" or "HH:MM:SS" string (bad input -> 0). */
export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** UTC-ms whose fields equal JST midnight today, for whole-day date math. */
export function jstTodayMs(now: number = Date.now()): number {
  const j = nowJst(now);
  return Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate());
}

/** The real UTC instant of JST 00:00 today (9h before jstTodayMs's value). */
export function jstMidnightInstantMs(now: number = Date.now()): number {
  return jstTodayMs(now) - JST_OFFSET_MS;
}

/** Whole-day difference between a "YYYY-MM-DD" due date and JST-today. */
export function dueDiffDays(due: string, todayMs: number): number {
  const [y, m, d] = due.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - todayMs) / 86_400_000);
}
