// The engine against values taken from the Python prototype.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { noise, pmod } from "../src/engine/canvas.js";
import { hex, mix, pyRound, rgb } from "../src/engine/color.js";
import { Layer } from "../src/engine/layer.js";
import { PyRandom } from "../src/engine/random.js";
import { sky } from "../src/engine/sky.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");

test("PyRandom reproduces Python's random.Random", () => {
  const expected = {
    0: [0.8444218515250481, 7, 3, "a", 2121, 0.9654648863619172],
    42: [0.6394267984578837, -5, 2, "b", 1828, 0.1395379285251439],
    717: [0.23816218732256422, -3, 1, "d", 7957, 0.24801904755097237],
    1099511627779: [0.21978710637116716, 3, 0, "e", 8039, 0.30414034353938],
  };
  for (const [seed, values] of Object.entries(expected)) {
    const r = new PyRandom(Number(seed));
    assert.deepEqual([r.random(), r.randint(-5, 7), r.randrange(4), r.choice("abcde"), r.getrandbits(13), r.random()], values);
  }
});

test("PyRandom is deterministic and stays in range", () => {
  const a = new PyRandom(31);
  const b = new PyRandom(31);
  for (let i = 0; i < 2000; i++) {
    const n = a.randint(-3, 3);
    assert.equal(n, b.randint(-3, 3));
    assert.ok(n >= -3 && n <= 3);
  }
  assert.throws(() => a.randrange(5, 5));
  assert.throws(() => a.choice([]));
});

test("pyRound rounds halves to even, like Python", () => {
  assert.deepEqual([0.5, 1.5, 2.5, 7.5, 22.5, -2.5, -3.5, 2.4, 2.6].map(pyRound), [0, 2, 2, 8, 22, -2, -4, 2, 3]);
});

test("pmod follows Python's modulo", () => {
  assert.deepEqual([pmod(-1, 2), pmod(-7, 6), pmod(7, 6), pmod(0, 9)], [1, 5, 1, 0]);
});

test("color helpers match the prototype", () => {
  assert.deepEqual(hex("#ff8a3d"), [255, 138, 61]);
  assert.equal(rgb([300, -4, 15.5]), "#ff0010");
  assert.deepEqual(
    [0, 1 / 6, 0.5, 1].map((k) => mix("#07090f", "#151b26", k)),
    ["#07090f", "#090c13", "#0e121a", "#151b26"],
  );
  assert.equal(mix("#000000", "#030303", 0.5), "#020202");
  assert.equal(mix("#000000", "#010101", 0.5), "#000000");
});

test("noise matches the prototype", () => {
  const got = [[0, 0, 7], [5, 3, 3], [239, 79, 11], [137, 40, 5], [-3, 2, 9]].map(
    ([x, y, s]) => Math.round(noise(x, y, s) * 1e12) / 1e12,
  );
  assert.deepEqual(got, [0.735454337377, 0.534813458457, 0.978744182498, 0.746059357595, 0.190280003052]);
});

function sampleLayer(options) {
  const L = new Layer(options);
  for (const [x, y, c] of [
    [5, 2, "#aa0000"], [6, 2, "#aa0000"], [5, 3, "#aa0000"], [6, 3, "#aa0000"],
    [1, 1, "#00bb00"], [2, 1, "#00bb00"], [9, 3, "#aa0000"], [0, 4, "#00bb00"],
  ]) {
    L.put(x, y, c);
  }
  return L;
}

test("Layer merges runs into one path per color, in scan order", () => {
  assert.equal(
    sampleLayer().paths(),
    '<path fill="#00bb00" d="M1 1h2v1h-2zM0 4h1v1h-1z"/><path fill="#aa0000" d="M5 2h2v2h-2zM9 3h1v1h-1z"/>',
  );
});

test("Layer can keep the insertion order of colors", () => {
  assert.equal(
    sampleLayer({ truncate: true }).pathsByInsertion(),
    '<path fill="#aa0000" d="M5 2h2v2h-2zM9 3h1v1h-1z"/><path fill="#00bb00" d="M1 1h2v1h-2zM0 4h1v1h-1z"/>',
  );
});

test("Layer clips to the canvas unless it is wide", () => {
  const L = new Layer();
  L.put(-1, 5, "#fff");
  L.put(240, 5, "#fff");
  L.put(5, 80, "#fff");
  assert.equal(L.size, 0);
  const wide = new Layer({ wide: true, truncate: true });
  wide.put(-1.7, 5.9, "#fff");
  wide.put(5, -1, "#fff");
  assert.deepEqual([...wide], [[-1, 5, "#fff"]]);
});

test("sky bands and dithering match the prototype", () => {
  // ruins KINDLED: 7 bands down to the ground line
  assert.equal(
    sha(sky("#080915", "#171a2e", { horizon: 62, bands: 7, id: "d" })),
    "9401b7cafe2be099003cbdb56654cde0974d64961560abbb2d21dfa4d00e6e5e",
  );
  // options.sky(): 8 bands of 7.5 px (halves rounded to even), filled below the horizon
  assert.equal(
    sha(sky("#0a0814", "#3a1b33", { horizon: 60, id: "b", fillBelow: true })),
    "081ce103e9a616eeb178849dc8d138c95241d4b77395fdf1292852f48423e48a",
  );
});
