import { describe, it, expect } from "vitest";
import { isDue, type Schedule } from "./schedule";

// 2026-07-08 is a Wednesday. 06:30 UTC == 15:30 JST.
const WED_1530_JST = Date.UTC(2026, 6, 8, 6, 30);
const WED_0830_JST = Date.UTC(2026, 6, 7, 23, 30); // 2026-07-07 23:30 UTC == 07-08 08:30 JST

const base: Schedule = {
  frequency: "daily",
  day_of_week: null,
  send_time: "09:00",
  enabled: true,
  last_sent_at: null,
};

describe("isDue", () => {
  it("false when disabled", () => {
    expect(isDue({ ...base, enabled: false }, WED_1530_JST)).toBe(false);
  });

  it("false before the send time", () => {
    // 08:30 JST is before 09:00
    expect(isDue({ ...base, send_time: "09:00" }, WED_0830_JST)).toBe(false);
  });

  it("true at/after the send time when not sent today", () => {
    expect(isDue({ ...base, send_time: "09:00" }, WED_1530_JST)).toBe(true);
  });

  it("false when already sent today (JST)", () => {
    // Sent at 2026-07-08 09:05 JST == 00:05 UTC
    const sent = new Date(Date.UTC(2026, 6, 8, 0, 5)).toISOString();
    expect(isDue({ ...base, last_sent_at: sent }, WED_1530_JST)).toBe(false);
  });

  it("true when last send was yesterday", () => {
    const sent = new Date(Date.UTC(2026, 6, 7, 0, 5)).toISOString();
    expect(isDue({ ...base, last_sent_at: sent }, WED_1530_JST)).toBe(true);
  });

  it("weekly: false on a non-matching weekday", () => {
    // day_of_week 1 = Monday, but WED_1530 is Wednesday (3)
    const wk: Schedule = { ...base, frequency: "weekly", day_of_week: 1 };
    expect(isDue(wk, WED_1530_JST)).toBe(false);
  });

  it("weekly: true on the matching weekday after the time", () => {
    const wk: Schedule = { ...base, frequency: "weekly", day_of_week: 3 };
    expect(isDue(wk, WED_1530_JST)).toBe(true);
  });
});
