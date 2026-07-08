import { describe, it, expect } from "vitest";
import {
  nowJst,
  jstDateKey,
  minutesOfDay,
  dueDiffDays,
  jstTodayMs,
  jstMidnightInstantMs,
} from "./jst";

// A fixed reference instant: 2026-07-08 06:30 UTC == 2026-07-08 15:30 JST.
const REF = Date.UTC(2026, 6, 8, 6, 30); // month is 0-based

describe("nowJst / jstDateKey", () => {
  it("reads JST wall-clock via getUTC*", () => {
    const j = nowJst(REF);
    expect(j.getUTCHours()).toBe(15); // 06:30 UTC -> 15:30 JST
    expect(jstDateKey(j)).toBe("2026-7-8");
  });

  it("rolls over to the next JST day after 15:00 UTC", () => {
    // 2026-07-08 16:00 UTC == 2026-07-09 01:00 JST
    const j = nowJst(Date.UTC(2026, 6, 8, 16, 0));
    expect(jstDateKey(j)).toBe("2026-7-9");
  });
});

describe("minutesOfDay", () => {
  it("parses HH:MM and HH:MM:SS", () => {
    expect(minutesOfDay("09:00")).toBe(540);
    expect(minutesOfDay("09:05:30")).toBe(545);
    expect(minutesOfDay("00:00")).toBe(0);
  });
  it("is safe on garbage input", () => {
    expect(minutesOfDay("")).toBe(0);
  });
});

describe("dueDiffDays", () => {
  const today = jstTodayMs(REF); // JST 2026-07-08 midnight
  it("is 0 for today, negative for overdue, positive for future", () => {
    expect(dueDiffDays("2026-07-08", today)).toBe(0);
    expect(dueDiffDays("2026-07-07", today)).toBe(-1);
    expect(dueDiffDays("2026-07-11", today)).toBe(3);
  });
  it("handles month and year boundaries", () => {
    const eom = jstTodayMs(Date.UTC(2026, 6, 31, 3, 0)); // JST 2026-07-31
    expect(dueDiffDays("2026-08-01", eom)).toBe(1);
    const eoy = jstTodayMs(Date.UTC(2026, 11, 31, 3, 0)); // JST 2026-12-31
    expect(dueDiffDays("2027-01-01", eoy)).toBe(1);
  });
});

describe("jstMidnightInstantMs", () => {
  it("is the real UTC instant of JST 00:00 (15:00 UTC the day before)", () => {
    const ms = jstMidnightInstantMs(REF);
    expect(new Date(ms).toISOString()).toBe("2026-07-07T15:00:00.000Z");
  });
});
