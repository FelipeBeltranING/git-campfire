// Every theme in every state against its snapshot, plus the rules every SVG
// must follow to render inside a GitHub README.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { renderCampfire } from "../src/render.js";
import { allCases } from "../scripts/cases.mjs";

const MAX_BYTES = 100 * 1024;

for (const c of allCases()) {
  test(`${c.name} matches its snapshot and follows the SVG rules`, () => {
    const svg = renderCampfire(c);
    const file = new URL(`./snapshots/${c.name}.svg`, import.meta.url);
    assert.ok(existsSync(file), `missing snapshot, run: npm run snapshots`);
    assert.equal(svg, readFileSync(file, "utf8"), "the art changed; if on purpose, run: npm run snapshots");

    assert.ok(Buffer.byteLength(svg) < MAX_BYTES, `${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB is over 100 KB`);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 240 80" width="720" height="240" role="img" aria-label="[^"]+">/);
    assert.ok(svg.endsWith("</svg>"));
    assert.doesNotMatch(svg, /<script|foreignObject|<image|on[a-z]+=|javascript:/i, "no scripts or external content");
    assert.doesNotMatch(svg, /href="http|url\(["']?http|@import/i, "no external resources");
    assert.doesNotMatch(svg, /var\(/, "no CSS custom properties");
    assert.match(svg, /svg\{shape-rendering:crispEdges\}/);
  });
}
