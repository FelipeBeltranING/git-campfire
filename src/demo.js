// A made-up contribution calendar, to try the scenes without network or token.

import { PyRandom } from "./engine/random.js";
import { addDays } from "./streak.js";

/**
 * A year of fake contributions that ends with a streak of `streak` days.
 * @param {object} o
 * @param {string} o.today YYYY-MM-DD
 * @param {number} [o.streak]
 * @param {number} [o.seed]
 */
export function demoCalendar({ today, streak = 23, seed = 7 }) {
  const rnd = new PyRandom(seed);
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const date = addDays(today, -i);
    let count = rnd.random() < 0.6 ? rnd.randint(1, 9) : 0;
    if (i < streak) count = Math.max(count, rnd.randint(1, 6));
    if (i === streak || (streak === 0 && i === 1)) count = 0; // with today's grace, 0 needs two empty days
    days.push({ date, count });
  }
  return days;
}
