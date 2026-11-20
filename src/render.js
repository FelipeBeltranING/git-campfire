// Render a campfire SVG from streak stats.

import { DEFAULT_THRESHOLDS, STATE_NAMES, parseThresholds, stateOf } from "./state.js";
import { renderRuins } from "./themes/ruins.js";

export const THEMES = {
  ruins: renderRuins,
};

/**
 * @param {object} o
 * @param {string} [o.theme] ruins (more to come)
 * @param {number} o.streak current streak in days
 * @param {number} o.week contributions in the last 7 days
 * @param {boolean[]} o.days the last 7 days, oldest first
 * @param {boolean} [o.showStats] draw the HUD
 * @param {string|number[]} [o.thresholds] where KINDLED, BLAZING and ETERNAL start
 * @param {string} [o.label] aria-label, defaults to a description of the fire
 * @returns {string} the SVG
 */
export function renderCampfire({ theme = "ruins", streak, week, days, showStats = true, thresholds = DEFAULT_THRESHOLDS, label }) {
  const draw = THEMES[theme];
  if (!draw) throw new Error(`Unknown theme "${theme}". Available: ${Object.keys(THEMES).join(", ")}.`);
  if (!Array.isArray(days) || days.length !== 7) throw new Error("days must list the last 7 days, oldest first.");
  const level = stateOf(streak, parseThresholds(thresholds));
  const name = STATE_NAMES[level];
  return draw({
    streak,
    week,
    days: days.map(Boolean),
    level,
    showStats,
    label: label ?? `git-campfire: a ${streak}-day contribution streak, the fire is ${name}`,
  });
}
