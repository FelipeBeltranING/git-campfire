// The ruins theme must stay byte-identical to the approved art in assets/ruins.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderCampfire } from "../src/render.js";
import { STATE_NAMES, parseThresholds, stateOf } from "../src/state.js";

const asset = (name) => readFileSync(new URL(`../assets/ruins/${name}.svg`, import.meta.url), "utf8");
const bits = (s) => [...s].map((c) => c === "1");

// The sample data used by prototype/generate_all.py
const SKETCHES = [
  ["ashen", 0, 0, "0000000"],
  ["kindled", 2, 5, "0000111"],
  ["blazing", 9, 23, "1111111"],
  ["eternal", 23, 41, "1111111"],
];

for (const [name, streak, week, days] of SKETCHES) {
  test(`ruins ${name} is byte-identical to the prototype`, () => {
    const level = stateOf(streak);
    const svg = renderCampfire({
      streak,
      week,
      days: bits(days),
      label: `git-campfire: racha de ${streak} dias (${STATE_NAMES[level]})`, // the prototype's label
    });
    assert.equal(svg, asset(name));
  });
}

test("the default label describes the fire", () => {
  const svg = renderCampfire({ streak: 9, week: 23, days: bits("1111111") });
  assert.match(svg, /aria-label="git-campfire: a 9-day contribution streak, the fire is BLAZING"/);
});

test("show_stats: false hides the HUD", () => {
  const withHud = renderCampfire({ streak: 23, week: 41, days: bits("1111111") });
  const without = renderCampfire({ streak: 23, week: 41, days: bits("1111111"), showStats: false });
  assert.ok(without.length < withHud.length);
  assert.ok(withHud.includes('<g class="st">'));
  assert.ok(!without.includes('<g class="st">'));
  assert.ok(!without.includes('fill="#3a3550"'), "no HUD frame");
});

test("thresholds decide the state", () => {
  assert.deepEqual([0, 1, 3, 4, 14, 15, 400].map((s) => stateOf(s)), [0, 1, 1, 2, 2, 3, 3]);
  const custom = parseThresholds("2, 7, 30");
  assert.deepEqual([1, 2, 6, 7, 29, 30].map((s) => stateOf(s, custom)), [0, 1, 1, 2, 2, 3]);
  const svg = renderCampfire({ streak: 20, week: 9, days: bits("1111111"), thresholds: "2,7,30" });
  assert.match(svg, /the fire is BLAZING/);
});

test("bad thresholds and themes fail with a clear message", () => {
  for (const bad of ["1,4", "4,1,15", "0,4,15", "a,b,c", "1,4,15,20", "1.5,4,15"]) {
    assert.throws(() => parseThresholds(bad), /Invalid thresholds/, bad);
  }
  assert.throws(() => renderCampfire({ theme: "nope", streak: 1, week: 1, days: bits("0000001") }), /Unknown theme "nope"/);
  assert.throws(() => renderCampfire({ streak: 1, week: 1, days: [true] }), /last 7 days/);
});

test("the same stats always give the same SVG", () => {
  const a = renderCampfire({ streak: 6, week: 12, days: bits("0111111") });
  const b = renderCampfire({ streak: 6, week: 12, days: bits("0111111") });
  assert.equal(a, b);
  assert.notEqual(a, renderCampfire({ streak: 7, week: 12, days: bits("0111111") }));
});
