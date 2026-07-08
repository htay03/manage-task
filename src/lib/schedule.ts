import { nowJst, jstDateKey, minutesOfDay } from "./jst";

// The scheduling-relevant fields of an email_settings row. Kept minimal and
// supabase-free so the logic below is a pure function we can unit-test.
export type Schedule = {
  frequency: "daily" | "weekly";
  day_of_week: number | null; // 0=Sun .. 6=Sat (used when weekly)
  send_time: string; // "HH:MM" or "HH:MM:SS"
  enabled: boolean;
  last_sent_at: string | null;
};

/**
 * Should a scheduled send fire now? Pure function of the schedule and the
 * current time (injectable for tests). It gates on enabled / weekday / time and
 * whether we already sent today (JST). Note: this is a best-effort guard; the
 * actual duplicate-proofing is the atomic "claim" in the API route.
 */
export function isDue(s: Schedule, now: number = Date.now()): boolean {
  if (!s.enabled) return false;
  const jst = nowJst(now);

  // Weekly: only on the configured weekday (JST).
  if (
    s.frequency === "weekly" &&
    s.day_of_week !== null &&
    jst.getUTCDay() !== s.day_of_week
  ) {
    return false;
  }

  // At or after the configured time-of-day (JST).
  const nowMin = jst.getUTCHours() * 60 + jst.getUTCMinutes();
  if (nowMin < minutesOfDay(s.send_time)) return false;

  // Not already sent today (JST).
  if (s.last_sent_at) {
    const last = nowJst(new Date(s.last_sent_at).getTime());
    if (jstDateKey(last) === jstDateKey(jst)) return false;
  }

  return true;
}
