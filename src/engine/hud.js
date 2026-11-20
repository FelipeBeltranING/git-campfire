// The HUD in the top-left corner: STREAK, WEEK, seven day cells and the state
// name, all drawn with the 3×5 bitmap font.

import { text } from "./font.js";
import { Layer } from "./layer.js";

export const HUD_COLORS = {
  frame: "#3a3550",
  bg: "#0b0a14",
  label: "#6f6a8a",
  week: "#d8d4ea",
  off: "#24213a",
};

/**
 * @param {object} o
 * @param {number} o.streak
 * @param {number} o.week contributions in the last 7 days
 * @param {boolean[]} o.days the last 7 days, oldest first
 * @param {string} o.status state name, e.g. "ETERNAL"
 * @param {string} o.color state color
 * @param {object} [o.colors] frame, bg and label colors
 * @param {number} [o.x0]
 * @param {number} [o.y0]
 * @returns {{ frame: Layer, status: Layer }}
 */
export function hud({ streak, week, days, status, color, colors = {}, x0 = 4, y0 = 4 }) {
  const pal = { ...HUD_COLORS, ...colors };
  const frame = new Layer({ truncate: true });
  const w = 44;
  const h = 33;
  for (let x = x0; x < x0 + w; x++) {
    for (let y = y0; y < y0 + h; y++) {
      const side = x === x0 || x === x0 + w - 1;
      const cap = y === y0 || y === y0 + h - 1;
      if (side && cap) continue; // rounded corners
      frame.put(x, y, side || cap ? pal.frame : pal.bg);
    }
  }
  text(frame, "STREAK", x0 + 3, y0 + 3, pal.label);
  text(frame, String(streak), x0 + 31, y0 + 3, color);
  text(frame, "WEEK", x0 + 3, y0 + 10, pal.label);
  text(frame, String(week), x0 + 31, y0 + 10, pal.week);
  days.forEach((on, i) => {
    for (let dx = 0; dx < 4; dx++) {
      for (let dy = 0; dy < 3; dy++) frame.put(x0 + 3 + i * 5 + dx, y0 + 17 + dy, on ? color : pal.off);
    }
  });
  const statusLayer = new Layer({ truncate: true });
  text(statusLayer, status, x0 + 3, y0 + 24, color);
  return { frame, status: statusLayer };
}
