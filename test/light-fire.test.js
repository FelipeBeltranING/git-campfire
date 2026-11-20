// Light, halo, fire and CSS against the Python prototype.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { BASE_CSS } from "../src/engine/css.js";
import { PAL_EPIC, PAL_WARM, flameFrames, flameGroups } from "../src/engine/fire.js";
import { Layer } from "../src/engine/layer.js";
import { haloRings, litLayer } from "../src/engine/light.js";
import { escapeXml, fixed, svgOpen, timing } from "../src/engine/svg.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");

test("halo rings match options.halo() in the prototype", () => {
  const rings = haloRings({ cx: 120, cy: 46, R: 60, color: "#ffb950" });
  const svg = `<g class="lt">${rings.map((L, i) => `<g class="h${i}">${L.pathsByInsertion()}</g>`).join("")}</g>`;
  assert.equal(sha(svg), "0a4667ce7ab2f3f78134fe234c8e96c06b7dbce2fde22b32c66bac09be1b6131");
});

test("halo rings get smaller and have a dithered edge", () => {
  const [outer, middle, inner] = haloRings({ cx: 120, cy: 40, R: 40, color: "#fff" });
  assert.ok(outer.size > middle.size && middle.size > inner.size);
  assert.ok(outer.has(120, 40));
  assert.ok(!outer.has(120 + 30, 40));
});

test("flame frames match options.flame_frames() in the prototype", () => {
  const Hf = 26;
  const Wm = 7.5;
  const frames = flameFrames({
    cx: 120, base: 61, Hf, Wm, pal: PAL_EPIC,
    seed: (f) => 99 * 101 + f * 17 + Hf,
    jitter: Math.min(1.1, Wm * 0.35),
    tongues: 1 + Math.floor(Hf / 8),
    truncate: true,
  });
  assert.equal(frames.length, 4);
  assert.equal(
    sha(flameGroups(frames, (L) => L.pathsByInsertion())),
    "c8f18133717ef810ab1df1701f4a90250a60f72ee2120b32654447523e40e382",
  );
});

test("the warm flame has no blue base, the epic one does", () => {
  const draw = (pal) =>
    flameFrames({ cx: 120, base: 61, Hf: 30, Wm: 9, pal, seed: (f) => f, tongues: 2 });
  const colors = (frames) => new Set(frames.flatMap((L) => [...L].map(([, , c]) => c)));
  assert.ok(!colors(draw(PAL_WARM)).has(PAL_EPIC[4]));
  assert.ok(colors(draw(PAL_EPIC)).has(PAL_EPIC[4]));
});

test("light is stronger near the fire and weaker on the background", () => {
  const scene = new Layer();
  const depth = new Map();
  for (const [x, dep] of [[100, "ground"], [101, "prop"], [102, "bg"]]) {
    scene.put(x, 60, "#202020");
    depth.set(`${x},60`, dep);
  }
  scene.put(10, 60, "#202020"); // too far to be lit
  const lit = litLayer(scene, depth, [{ x: 100, y: 56, groundY: 61, R: 46, strength: 0.55, color: "#ff8a3d" }], {
    groundStretch: 3.2,
  });
  assert.equal(lit.size, 3);
  assert.ok(!lit.has(10, 60));
  const red = (x) => parseInt(lit.get(x, 60).slice(1, 3), 16);
  assert.ok(red(101) > red(102), "a prop catches more light than the background");
});

test("the CSS only uses keyframes and classes", () => {
  assert.ok(BASE_CSS.startsWith("\n") && BASE_CSS.endsWith("\n"));
  assert.ok(BASE_CSS.includes("svg{shape-rendering:crispEdges}"));
  assert.ok(!/var\(|url\(|@import|<script/i.test(BASE_CSS));
  for (const cls of ["fl", "lt", "cl", "tw", "em0", "em4", "sm0", "sm3", "rn", "st"]) {
    assert.ok(BASE_CSS.includes(`.${cls}{`), `.${cls} is defined`);
  }
});

test("the SVG head is self-contained and escapes the label", () => {
  const head = svgOpen('Tom & "Jerry" <3', "");
  assert.ok(head.includes('viewBox="0 0 240 80" width="720" height="240"'));
  assert.ok(head.includes('role="img" aria-label="Tom &amp; &quot;Jerry&quot; &lt;3"'));
  assert.equal(escapeXml("a'b"), "a&apos;b");
  assert.equal(timing(2.25, -0.04), "animation-duration:2.2s;animation-delay:-0.0s");
  // Python's f"{x:.1f}": exact halves go to even, everything else to the nearest
  assert.deepEqual(
    [[2.25, 1], [2.75, 1], [0.15, 1], [0.125, 2], [-2.25, 1], [-0, 1], [3.3000000000000003, 1], [0.39, 2]].map(([x, d]) => fixed(x, d)),
    ["2.2", "2.8", "0.1", "0.12", "-2.2", "-0.0", "3.3", "0.39"],
  );
});
