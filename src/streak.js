// Streak math. Pure functions: no network, no clock unless you pass one.

/**
 * Today's date (YYYY-MM-DD) in an IANA time zone.
 * @param {string} timeZone e.g. "America/Bogota"
 * @param {Date} [now]
 */
export function todayIn(timeZone = "UTC", now = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  } catch {
    throw new Error(`Unknown time zone "${timeZone}". Use an IANA name like "America/Bogota" or "UTC".`);
  }
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Add n days to a YYYY-MM-DD date. */
export function addDays(date, n) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * @param {Array<{date: string, count: number}>} calendar
 * @param {object} o
 * @param {string} o.today YYYY-MM-DD, already in the user's time zone
 * @returns {{streak: number, longest: number, week: number, days: boolean[], today: string}}
 */
export function computeStats(calendar, { today }) {
  const counts = new Map();
  for (const { date, count } of calendar) if (date <= today) counts.set(date, count);
  const count = (date) => counts.get(date) ?? 0;

  // Today's grace: no contribution yet today does not break the streak.
  let day = count(today) > 0 ? today : addDays(today, -1);
  let streak = 0;
  while (count(day) > 0) {
    streak++;
    day = addDays(day, -1);
  }

  let longest = 0;
  let run = 0;
  let prev = null;
  for (const date of [...counts.keys()].sort()) {
    if (counts.get(date) > 0) {
      run = prev !== null && addDays(prev, 1) === date && run > 0 ? run + 1 : 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    prev = date;
  }

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  return {
    streak,
    longest: Math.max(longest, streak),
    week: last7.reduce((sum, d) => sum + count(d), 0),
    days: last7.map((d) => count(d) > 0),
    today,
  };
}
