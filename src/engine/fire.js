// The procedural flame: a teardrop profile that sways, drawn in a few frames
// that take turns with the `fl` animation.

import { Layer } from "./layer.js";
import { PyRandom } from "./random.js";
import { fixed } from "./svg.js";

/** Flame palettes: [core, mid, outer, tip, deep (blue base or null)]. */
export const PAL_WARM = ["#fff1b0", "#ffb53b", "#f0611f", "#a8301a", null];
export const PAL_EPIC = ["#fff6d6", "#ffd45a", "#ff8a2a", "#c0391d", "#7ec8ff"];
export const PAL_VOID = ["#f4ecff", "#c9a2ff", "#8a5cff", "#4b2aa8", "#9ff0ff"];

/**
 * @param {object} o
 * @param {number} o.cx center of the flame base
 * @param {number} o.base y of the flame base
 * @param {number} o.Hf flame height
 * @param {number} o.Wm max half-width
 * @param {Array<string|null>} o.pal palette
 * @param {(f: number) => number} o.seed seed of the random generator for frame f
 * @param {number} [o.jitter] how much the width wobbles per row
 * @param {number} [o.tongues] loose flame pixels above the tip
 * @param {number} [o.frames]
 * @param {boolean} [o.truncate] truncate coordinates on put
 * @returns {Layer[]}
 */
export function flameFrames({ cx, base, Hf, Wm, pal, seed, jitter = 1.1, tongues, frames = 4, truncate = false }) {
  const [core, mid, out, tip, deep] = pal;
  const result = [];
  for (let f = 0; f < frames; f++) {
    const rnd = new PyRandom(seed(f));
    const L = new Layer({ truncate });
    const phase = (f * Math.PI) / 2;
    for (let t = 0; t < Hf; t++) {
      const u = t / Hf;
      let hw = Wm * (1 - u) ** 0.85 * Math.min(1, (u + 0.22) * 2.4);
      hw += (rnd.random() - 0.5) * jitter;
      const c0 = cx + Math.sin(u * 4.2 + phase) * u * Wm * 0.35;
      const y = base - t;
      for (let x = Math.trunc(c0 - hw - 1); x < Math.trunc(c0 + hw + 2); x++) {
        const rel = Math.abs(x + 0.5 - c0) / Math.max(hw, 0.6);
        if (rel > 1) continue;
        let c;
        if (u > 0.78) c = rel > 0.4 ? tip : out;
        else if (rel < 0.38 && u < 0.62) c = deep && u < 0.1 && rel < 0.22 ? deep : core;
        else if (rel < 0.72) c = mid;
        else c = out;
        L.put(x, y, c);
      }
    }
    for (let i = 0; i < tongues; i++) {
      const tx = Math.trunc(cx + (rnd.random() - 0.5) * Wm * 1.2);
      const ty = base - Hf - rnd.randint(0, 3);
      L.put(tx, ty, out);
      L.put(tx, ty - 1, tip);
    }
    result.push(L);
  }
  return result;
}

/** Wrap flame frames in `fl` groups, each one delayed by 0.13 s. */
export function flameGroups(frames, serialize = (L) => L.paths()) {
  return frames
    .map((L, i) => `<g class="fl" style="animation-delay:-${fixed(i * 0.13, 2)}s">${serialize(L)}</g>`)
    .join("");
}
