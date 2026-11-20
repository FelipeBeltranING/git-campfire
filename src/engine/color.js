// Color helpers. Rounding follows Python's round() (half to even), so blended
// colors match the reference art exactly.

/** Python's round(): halves go to the nearest even integer. */
export function pyRound(x) {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r;
}

/** "#rrggbb" → [r, g, b] */
export function hex(color) {
  const c = color.replace(/^#/, "");
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
}

/** [r, g, b] → "#rrggbb", clamped to 0..255. */
export function rgb(t) {
  return "#" + t.map((v) => Math.max(0, Math.min(255, pyRound(v))).toString(16).padStart(2, "0")).join("");
}

/** Blend a toward b by k (0 = a, 1 = b). */
export function mix(a, b, k) {
  const A = hex(a);
  const B = hex(b);
  return rgb(A.map((v, i) => v + (B[i] - v) * k));
}
