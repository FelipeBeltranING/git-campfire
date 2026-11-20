// The <svg> document around a scene.

import { H, SCALE, W } from "./canvas.js";

/** Escape text for an XML attribute or text node. */
export function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}

/** The opening tag and the <style> block. */
export function svgOpen(label, css) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * SCALE}" height="${H * SCALE}" ` +
    `role="img" aria-label="${escapeXml(label)}">` +
    (css ? `<style>${css}</style>` : "")
  );
}

/**
 * Format a number with fixed decimals exactly like Python's f"{x:.nf}": exact
 * halves round to even (2.25 → "2.2"), and negative zero keeps its sign.
 */
export function fixed(x, digits) {
  const sign = x < 0 || Object.is(x, -0) ? "-" : "";
  const a = Math.abs(x);
  // toFixed(100) is the exact decimal value of the double for these magnitudes.
  const [, frac = ""] = a.toFixed(100).split(".");
  const tie = /^50*$/.test(frac.slice(digits));
  let s = a.toFixed(digits); // nearest, halves away from zero
  if (tie) {
    const down = (Math.trunc(a * 10 ** digits) / 10 ** digits).toFixed(digits);
    if (Number(down.at(-1)) % 2 === 0) s = down;
  }
  return sign + s;
}

/** A random animation duration and delay, written like the prototype (one decimal). */
export function timing(duration, delay) {
  return `animation-duration:${fixed(duration, 1)}s;animation-delay:${fixed(delay, 1)}s`;
}
