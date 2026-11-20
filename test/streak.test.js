// The streak math: today's grace, time zones, the week and the longest streak.
import assert from "node:assert/strict";
import { test } from "node:test";

import { addDays, computeStats, todayIn } from "../src/streak.js";

const TODAY = "2026-11-20";
/** A calendar from a string of counts, the last one being `end`. */
const cal = (counts, end = TODAY) =>
  counts.map((count, i) => ({ date: addDays(end, i - counts.length + 1), count }));

test("an empty year is ASHEN material", () => {
  assert.deepEqual(computeStats(cal(Array(365).fill(0)), { today: TODAY }), {
    streak: 0, longest: 0, week: 0, days: Array(7).fill(false), today: TODAY,
  });
  assert.equal(computeStats([], { today: TODAY }).streak, 0);
});

test("the streak runs through today", () => {
  const s = computeStats(cal([0, 2, 1, 4, 1]), { today: TODAY });
  assert.equal(s.streak, 4);
  assert.equal(s.week, 8);
  assert.deepEqual(s.days, [false, false, false, true, true, true, true]);
});

test("today's grace: no contribution yet today does not break the streak", () => {
  const s = computeStats(cal([0, 3, 3, 3, 0]), { today: TODAY });
  assert.equal(s.streak, 3);
  assert.deepEqual(s.days.slice(-2), [true, false]);
});

test("a gap yesterday breaks the streak", () => {
  assert.equal(computeStats(cal([5, 5, 5, 0, 1]), { today: TODAY }).streak, 1);
  assert.equal(computeStats(cal([5, 5, 0, 0]), { today: TODAY }).streak, 0);
});

test("days after today are ignored", () => {
  const calendar = cal([1, 1, 1, 7], addDays(TODAY, 1)); // the API already has "tomorrow"
  const s = computeStats(calendar, { today: TODAY });
  assert.equal(s.streak, 3);
  assert.equal(s.week, 3);
});

test("the streak and the week cross the new year", () => {
  const calendar = cal([0, 1, 1, 1, 1, 1], "2027-01-02");
  const s = computeStats(calendar, { today: "2027-01-02" });
  assert.equal(s.streak, 5);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-03-01", -1), "2028-02-29");
});

test("the longest streak is kept even when the fire is out", () => {
  const s = computeStats(cal([1, 1, 1, 1, 1, 1, 0, 2, 2, 0, 0]), { today: TODAY });
  assert.equal(s.streak, 0);
  assert.equal(s.longest, 6);
});

test("today depends on the time zone", () => {
  const now = new Date("2026-11-20T03:30:00Z"); // 22:30 on the 19th in Bogotá
  assert.equal(todayIn("UTC", now), "2026-11-20");
  assert.equal(todayIn("America/Bogota", now), "2026-11-19");
  assert.equal(todayIn("Asia/Tokyo", new Date("2026-11-19T16:00:00Z")), "2026-11-20");
  assert.throws(() => todayIn("Mars/Olympus"), /Unknown time zone "Mars\/Olympus"/);
});

test("a UTC cron no longer breaks a streak at 7 p.m. in Bogotá", () => {
  // Contributed every day until the 19th (Bogotá). At 00:30 UTC on the 20th it is
  // still the 19th in Bogotá, and the GitHub calendar may already show the 20th.
  const calendar = [...cal([1, 1, 1, 1], "2026-11-19"), { date: "2026-11-20", count: 0 }];
  const now = new Date("2026-11-20T00:30:00Z");
  assert.equal(computeStats(calendar, { today: todayIn("America/Bogota", now) }).streak, 4);
  assert.equal(computeStats(calendar, { today: todayIn("UTC", now) }).streak, 4, "grace covers UTC too");
});
