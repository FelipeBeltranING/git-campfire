// Canvas size and integer helpers shared by every theme.

/** Logical canvas: 240×80 pixels, drawn at scale 3. */
export const W = 240;
export const H = 80;
export const SCALE = 3;

/** Python's % (the result takes the sign of the divisor). */
export function pmod(a, n) {
  return ((a % n) + n) % n;
}

/** Python's 32-bit value noise used by the scenes (stable texture, no PRNG). */
export function noise(x, y, seed = 7) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 2147483647)) >>> 0;
  n = Math.imul((n ^ (n >>> 13)) >>> 0, 1274126177) >>> 0;
  return (n & 0xffff) / 0xffff;
}
