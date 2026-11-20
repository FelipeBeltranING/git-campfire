// The night sky: color bands with a 2×2 checkerboard dithering row between them.

import { W, H } from "./canvas.js";
import { mix, pyRound } from "./color.js";

/**
 * @param {string} top color at the top of the sky
 * @param {string} bottom color at the horizon
 * @param {object} options
 * @param {number} options.horizon y where the sky ends
 * @param {number} [options.bands] number of color bands
 * @param {string} [options.id] prefix for the dithering <pattern> ids
 * @param {boolean} [options.fillBelow] fill from the horizon to the bottom with `bottom`
 */
export function sky(top, bottom, { horizon, bands = 8, id = "s", fillBelow = false }) {
  const bh = horizon / bands;
  let defs = "";
  let out = "";
  for (let b = 0; b < bands; b++) {
    const y0 = pyRound(b * bh);
    const y1 = pyRound((b + 1) * bh);
    out += `<rect x="0" y="${y0}" width="${W}" height="${y1 - y0}" fill="${mix(top, bottom, b / (bands - 1))}"/>`;
    if (b) {
      const pc = mix(top, bottom, (b - 1) / (bands - 1));
      defs +=
        `<pattern id="${id}${b}" width="2" height="2" patternUnits="userSpaceOnUse">` +
        `<rect width="1" height="1" fill="${pc}"/><rect x="1" y="1" width="1" height="1" fill="${pc}"/></pattern>`;
      out += `<rect x="0" y="${y0}" width="${W}" height="2" fill="url(#${id}${b})"/>`;
    }
  }
  if (fillBelow) {
    const h = pyRound(horizon);
    out += `<rect x="0" y="${h}" width="${W}" height="${H - h}" fill="${bottom}"/>`;
  }
  return `<defs>${defs}</defs>${out}`;
}
