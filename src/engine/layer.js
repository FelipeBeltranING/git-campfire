// A layer of pixels, (x, y) → color, compressed into one <path> per color.
//
// Contiguous pixels of the same color on a row become a run, a run identical to
// one on the row above extends it, and each color is written as a single path
// of `M{x} {y}h{w}v{h}h-{w}z` rectangles. That keeps a full scene at 25-70 KB.

import { H, W } from "./canvas.js";

export class Layer {
  /**
   * @param {object} [options]
   * @param {boolean} [options.truncate] truncate coordinates to integers on put
   * @param {boolean} [options.wide] keep pixels left or right of the canvas
   */
  constructor({ truncate = false, wide = false } = {}) {
    this.pixels = new Map();
    this.truncate = truncate;
    this.wide = wide;
  }

  put(x, y, color) {
    if (this.truncate) {
      x = Math.trunc(x);
      y = Math.trunc(y);
    }
    if (y < 0 || y >= H) return;
    if (!this.wide && (x < 0 || x >= W)) return;
    this.set(x, y, color);
  }

  /** Set a pixel without clipping or truncating, like assigning to the prototype's dict. */
  set(x, y, color) {
    const key = `${x},${y}`;
    const px = this.pixels.get(key);
    if (px) px[2] = color;
    else this.pixels.set(key, [x, y, color]);
  }

  get(x, y) {
    return this.pixels.get(`${x},${y}`)?.[2];
  }

  has(x, y) {
    return this.pixels.has(`${x},${y}`);
  }

  get size() {
    return this.pixels.size;
  }

  /** Pixels in the order they were first put: [x, y, color]. */
  *[Symbol.iterator]() {
    yield* this.pixels.values();
  }

  /**
   * Paths with colors in scan order (rows top to bottom, left to right).
   * Matches `render.Layer.rects()` in the prototype.
   */
  paths() {
    const runs = new Map();
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const c = this.get(x, y);
        if (c === undefined) {
          x++;
          continue;
        }
        const x0 = x;
        while (x < W && this.get(x, y) === c) x++;
        push(runs, c, [x0, y, x - x0]);
      }
    }
    return emit(runs);
  }

  /**
   * Paths with colors in the order their first pixel was put, runs sorted by
   * row. Matches `options.P.svg()` in the prototype.
   */
  pathsByInsertion() {
    const rows = new Map();
    for (const [x, y, c] of this.pixels.values()) push(rows, `${c}\u0000${y}`, x);
    const byColor = new Map();
    for (const [key, xs] of rows) {
      const [c, ys] = key.split("\u0000");
      const y = Number(ys);
      xs.sort((a, b) => a - b);
      let start = xs[0];
      let prev = xs[0];
      for (let i = 1; i <= xs.length; i++) {
        const x = xs[i];
        if (x !== undefined && x === prev + 1) {
          prev = x;
          continue;
        }
        push(byColor, c, [start, y, prev - start + 1]);
        if (x !== undefined) start = prev = x;
      }
    }
    for (const rs of byColor.values()) rs.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    return emit(byColor);
  }
}

function push(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** Merge equal runs on consecutive rows and write one <path> per color. */
function emit(runsByColor) {
  let out = "";
  for (const [c, runs] of runsByColor) {
    const open = new Map();
    const done = [];
    for (const [x, y, w] of runs) {
      const key = `${x},${w},${y}`;
      let r = open.get(key);
      if (r) {
        open.delete(key);
        r[3] += 1;
      } else {
        r = [x, y, w, 1];
        done.push(r);
      }
      open.set(`${x},${w},${y + 1}`, r);
    }
    const d = done.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h-${w}z`).join("");
    out += `<path fill="${c}" d="${d}"/>`;
  }
  return out;
}
