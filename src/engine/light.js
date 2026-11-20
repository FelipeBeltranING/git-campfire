// Firelight: a lit copy of the scene, tinted by distance and depth, plus the
// glowing halo in the air around the flame.

import { pmod } from "./canvas.js";
import { mix } from "./color.js";
import { Layer } from "./layer.js";

/** 2×2 ordered dithering thresholds. */
const BAYER = [
  [0, 0.5],
  [0.75, 0.25],
];

/** How far the light reaches by depth: [vertical stretch, distance factor, strength]. */
const DEPTHS = {
  ground: [null, 1, 1.0],
  prop: [1.2, 1, 1.15],
  bg: [1.1, 1.6, 0.45],
};

/**
 * Tint every scene pixel lit by one or more light sources.
 *
 * Ground pixels get the light in a flattened ellipse, near props 115 % and the
 * background 45 %. The result is quantized to 4 levels with ordered dithering.
 *
 * @param {Layer} scene
 * @param {Map<string, string>} depth "x,y" → "ground" | "prop" | "bg" (missing = "bg")
 * @param {Array<{x: number, y: number, groundY?: number, R: number, strength: number, color: string}>} sources
 * @param {object} [options]
 * @param {number} [options.groundStretch] vertical stretch of the light on the ground
 */
export function litLayer(scene, depth, sources, { groundStretch = 3.0 } = {}) {
  const lit = new Layer();
  for (const [x, y, c] of scene) {
    const dep = depth.get(`${x},${y}`) ?? "bg";
    let best = 0;
    let bestColor = null;
    for (const src of sources) {
      let d;
      let k;
      if (dep === "ground") {
        d = Math.hypot(x - src.x, (y - (src.groundY ?? src.y)) * groundStretch);
        k = DEPTHS.ground[2];
      } else {
        const [stretch, factor, strength] = DEPTHS[dep] ?? DEPTHS.bg;
        d = Math.hypot(x - src.x, (y - src.y) * stretch) * factor;
        k = strength;
      }
      const i = Math.max(0, 1 - d / src.R);
      if (i <= 0) continue;
      const q = i * 4 + (BAYER[pmod(y, 2)][pmod(x, 2)] - 0.4) * 0.6;
      const lvl = Math.max(0, Math.min(4, Math.ceil(q))) / 4;
      const v = lvl * src.strength * k;
      if (v > best) {
        best = v;
        bestColor = src.color;
      }
    }
    if (best > 0) lit.set(x, y, mix(c, bestColor, Math.min(0.9, best)));
  }
  return lit;
}

/**
 * Three rings of light in the air (radius R × .55, .35 and .2), stretched
 * horizontally by `sx`, with a dithered outer edge. Drawn with fill-opacity
 * .10 / .12 / .14 through the classes h0, h1 and h2.
 *
 * @param {object} o
 * @param {number} o.cx
 * @param {number} o.cy
 * @param {number} o.R
 * @param {string} o.color
 * @param {number} [o.sx]
 * @param {(rr: number) => {x0: number, x1: number, y0: number, y1: number}} [o.bounds]
 *   inclusive area scanned for each ring
 * @returns {Layer[]}
 */
export function haloRings({ cx, cy, R, color, sx = 1.25, bounds }) {
  const area =
    bounds ??
    ((rr) => ({
      x0: Math.trunc(cx - rr * sx) - 1,
      x1: Math.trunc(cx + rr * sx) + 1,
      y0: Math.trunc(cy - rr) - 1,
      y1: Math.trunc(cy + rr) + 1,
    }));
  return [R * 0.55, R * 0.35, R * 0.2].map((rr) => {
    const L = new Layer({ truncate: true });
    const { x0, x1, y0, y1 } = area(rr);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const e = Math.hypot((x - cx) / sx, y - cy) / rr;
        if (e <= 1 && !(e > 0.9 && pmod(x + y, 2))) L.put(x, y, color);
      }
    }
    return L;
  });
}
