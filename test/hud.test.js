// The bitmap font and the HUD.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { FONT, text } from "../src/engine/font.js";
import { compact, hud } from "../src/engine/hud.js";
import { Layer } from "../src/engine/layer.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");

test("every glyph is 3x5", () => {
  for (const [ch, g] of Object.entries(FONT)) assert.match(g, /^[01]{15}$/, `glyph ${ch}`);
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ") assert.ok(FONT[ch], `glyph ${ch}`);
});

test("text advances 4 px per character and draws unknown ones as spaces", () => {
  const L = new Layer();
  assert.equal(text(L, "a1?", 10, 10, "#fff"), 22);
  assert.ok(![...L].some(([x]) => x >= 18), "? draws nothing");
  assert.ok(L.has(11, 10), "the top of the A");
});

// options.hud() in the prototype, which keeps colors in insertion order
const protoHud = (o) => {
  const { frame, status } = hud(o);
  const st = status.pathsByInsertion();
  return frame.pathsByInsertion() + (o.blink ? `<g class="st">${st}</g>` : st);
};

test("the HUD matches the prototype", () => {
  assert.equal(
    sha(protoHud({ streak: 23, week: 41, days: Array(7).fill(true), status: "ETERNAL", color: "#ffd27a", blink: true })),
    "9b86c356e90e9bdd1cf9bb10351c01a766d6a6b650642d1d0478f175f050b234",
  );
  assert.equal(
    sha(protoHud({ streak: 0, week: 0, days: Array(7).fill(false), status: "ASHEN", color: "#8a8f9e" })),
    "c8fea3d77d9adf4be945a07e86872bc8143b80312bfe3c8d1eef3e1b6a9c4de7",
  );
});

test("big numbers stay inside the frame", () => {
  for (const [streak, week] of [[365, 1200], [371, 99999], [5, 1234567]]) {
    const { frame } = hud({ streak, week, days: Array(7).fill(true), status: "ETERNAL", color: "#ffd27a" });
    const xs = [...frame].map(([x]) => x);
    assert.ok(Math.max(...xs) <= 4 + 43, `${streak}/${week} fits`);
    // nothing is drawn over the right border except the border itself
    for (const [x, y, c] of frame) if (x === 4 + 43) assert.equal(c, "#3a3550", `${x},${y}`);
  }
  assert.deepEqual([compact(41), compact(99999), compact(1234567), compact(-3)], ["41", "99999", "1234K", "0"]);
});
