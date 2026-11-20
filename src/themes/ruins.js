// ruins: the default theme. Night ruins, a dead tree, a crescent moon and a
// menhir whose rune lights up with the streak. Ported from prototype/render.py.

import { BASE_CSS } from "../engine/css.js";
import { H, W, noise, pmod } from "../engine/canvas.js";
import { PAL_EPIC, PAL_WARM, flameFrames, flameGroups } from "../engine/fire.js";
import { hud } from "../engine/hud.js";
import { Layer } from "../engine/layer.js";
import { haloRings, litLayer } from "../engine/light.js";
import { PyRandom } from "../engine/random.js";
import { sky } from "../engine/sky.js";
import { svgOpen, timing } from "../engine/svg.js";

const GY = 62; // ground line
const FX = 120; // fire center
const FB = 61; // fire base

/** The four states of the ruins, from ASHEN to ETERNAL. */
export const STATES = [
  { name: "ASHEN", label: "#8a8f9e", sky: ["#07090f", "#151b26"], light: null, flame: null, embers: 0, stars: 10, smoke: 7, rune: null },
  { name: "KINDLED", label: "#ffb35c", sky: ["#080915", "#171a2e"], light: ["#ff8a3d", 26, 0.45], flame: [9, 3.2], embers: 4, stars: 16, smoke: 3, rune: "#5a3a2a" },
  { name: "BLAZING", label: "#ff9a3c", sky: ["#080915", "#1a1c33"], light: ["#ff8a3d", 46, 0.55], flame: [21, 6.5], embers: 12, stars: 22, smoke: 0, rune: "#c4612b" },
  { name: "ETERNAL", label: "#ffd27a", sky: ["#0a0816", "#221a35"], light: ["#ffb950", 70, 0.62], flame: [34, 9.5], embers: 28, stars: 42, smoke: 0, rune: "#ffe29a" },
];

/** The seated traveler: a hooded cloak with a red scarf and a staff. */
const TRAVELER = [
  "....hhhh.....",
  "...hccccc....",
  "..hccCCcccw..",
  "..hcCffffcw..",
  "..hcCffefcw..",
  "..hccffffcw..",
  "..sssssssscw.",
  ".hccsscccCcw.",
  ".hcccccccccCw",
  ".hccccccccCCw",
  "hcccccccccCcw",
  "hcccckkkkkkcw",
  "hcccckkkkkk.w",
  ".hcccbb..bb.w",
  "..hhhbb..bb.w",
];
const TRAVELER_PAL = {
  h: "#141220", c: "#34304a", C: "#4a4466", f: "#0c0b12", e: "#2a2633", s: "#6e2727",
  k: "#3e3958", b: "#221c19", w: "#4d3b27",
};

/** The scene that never moves, plus the depth of each pixel for the light. */
function buildScene() {
  const sc = new Layer();
  const depth = new Map();
  const setDepthIfMissing = (value) => {
    for (const [x, y] of sc) if (!depth.has(`${x},${y}`)) depth.set(`${x},${y}`, value);
  };
  const rnd = new PyRandom(42);

  // far hills
  for (let x = 0; x < W; x++) {
    const top = Math.trunc(53 + 3 * Math.sin(x / 17) + 2 * Math.sin(x / 7 + 1));
    for (let y = top; y < GY; y++) sc.put(x, y, "#0e1120");
  }

  // broken pillars
  const ruin = "#171b2e";
  const edge = "#20253c";
  const pillar = (x0, x1, top) => {
    for (let x = x0; x <= x1; x++) {
      const t = top + Math.trunc(noise(x, 3) * 4);
      for (let y = t; y < GY; y++) {
        let c = x === x0 ? edge : ruin;
        if (pmod(y - t, 7) === 0 && y > t) c = "#131628"; // block joints
        sc.put(x, y, c);
      }
    }
    for (let x = x0 - 1; x < x1 + 2; x++) sc.put(x, top + 6, edge); // capital
  };
  pillar(28, 33, 32);
  pillar(44, 48, 47);
  pillar(214, 219, 30);
  pillar(228, 231, 50);

  // wall with an arch
  const [wx0, wx1, ax0, ax1, ay] = [158, 204, 170, 192, 44];
  const acx = (ax0 + ax1) / 2;
  const ar = (ax1 - ax0) / 2;
  for (let x = wx0; x <= wx1; x++) {
    const top = 27 + Math.trunc(noise(x, 9) * 6) + (x > 196 ? 4 : 0);
    for (let y = top; y < GY; y++) {
      const insideArch = ax0 <= x && x <= ax1 && (y >= ay || (x - acx) ** 2 + ((y - ay) * 1.15) ** 2 <= ar ** 2);
      if (insideArch) continue;
      let c = ruin;
      if (pmod(y - top, 6) === 0) c = "#131628";
      if (pmod(x + Math.floor(y / 6) * 3, 9) === 0) c = "#131628";
      if (x === wx0 || y === top) c = edge;
      sc.put(x, y, c);
    }
  }

  // dead tree in the right corner
  const tree = "#0b0c15";
  for (let y = 0; y < GY; y++) {
    const x = 236 + Math.trunc(Math.sin(y / 9) * 1.5);
    for (let dx = -1; dx < (y > 40 ? 2 : 1); dx++) sc.put(x + dx, y, tree);
  }
  const branch = (x, y, dx, dy, n) => {
    for (let i = 0; i < n; i++) {
      sc.put(Math.trunc(x), Math.trunc(y), tree);
      x += dx + (rnd.random() - 0.5) * 0.6;
      y += dy + (rnd.random() - 0.5) * 0.6;
    }
  };
  branch(236, 14, -1.2, -0.4, 22);
  branch(236, 24, -1.0, -0.7, 16);
  branch(222, 9, -1.0, 0.5, 9);
  branch(214, 4, -1.1, 0.3, 14);
  for (const [x, y] of sc) depth.set(`${x},${y}`, "bg");

  // ground
  for (let y = GY; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = noise(x, y, 3) < 0.95 ? "#17140f" : "#1f1a13";
      if (y > 73) c = "#100e0b";
      sc.put(x, y, c);
      depth.set(`${x},${y}`, "ground");
    }
  }
  for (let x = 0; x < W; x++) {
    // grass
    if (noise(x, 1, 11) > 0.55) {
      sc.put(x, GY - 1, "#16211a");
      if (noise(x, 2, 11) > 0.8) sc.put(x, GY - 2, "#16211a");
    }
  }
  setDepthIfMissing("ground");

  // the menhir with its rune
  const mx = 137;
  for (let y = 37; y < GY; y++) {
    const half = y > 40 ? 3 : 3 - Math.floor((40 - y) / 2);
    for (let x = mx - half; x <= mx + half; x++) {
      let c = x !== mx - half ? "#2a2c3b" : "#33364a";
      if (noise(x, y, 5) > 0.93) c = "#232532";
      sc.put(x, y, c);
    }
  }

  // stones around the fire
  for (const [sx, sy, w] of [[108, 60, 3], [112, 61, 2], [127, 61, 2], [130, 60, 3], [115, 62, 3], [124, 62, 3], [119, 62, 3]]) {
    for (let i = 0; i < w; i++) {
      sc.put(sx + i, sy, "#3a3a44");
      sc.put(sx + i, sy + 1, "#2b2b33");
    }
  }

  // crossed logs
  for (let i = 0; i < 14; i++) {
    const lift = Math.floor(i / 5);
    sc.put(113 + i, 60 - lift, "#3b2717");
    sc.put(113 + i, 61 - lift, "#2a1b10");
    sc.put(127 - i, 60 - lift, "#4a311c");
    sc.put(127 - i, 61 - lift, "#2f1f12");
  }

  // the traveler
  const ox = 92;
  const oy = GY - TRAVELER.length + 1;
  TRAVELER.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (TRAVELER_PAL[ch]) sc.put(ox + i, oy + j, TRAVELER_PAL[ch]);
    });
  });
  setDepthIfMissing("prop");
  return { sc, depth };
}

function buildRune(st) {
  const r = new Layer();
  if (!st.rune) return r;
  for (const [x, y] of [[137, 42], [137, 43], [137, 44], [137, 45], [137, 46], [137, 47], [137, 48],
    [136, 43], [138, 45], [136, 47], [138, 47], [136, 49], [138, 49]]) {
    r.put(x, y, st.rune);
  }
  return r;
}

function buildCoals(st) {
  const L = new Layer();
  for (const [x, y] of [[116, 59], [119, 58], [121, 59], [124, 58], [118, 60], [122, 60]]) {
    L.put(x, y, st.name === "ASHEN" ? "#b8361c" : "#ff7a2a");
  }
  return L;
}

/**
 * Render the ruins scene.
 *
 * @param {object} o
 * @param {number} o.streak current streak in days
 * @param {number} o.week contributions in the last 7 days
 * @param {boolean[]} o.days the last 7 days, oldest first
 * @param {number} o.level 0 ASHEN, 1 KINDLED, 2 BLAZING, 3 ETERNAL
 * @param {string} o.label aria-label of the image
 * @param {boolean} [o.showStats] draw the HUD
 * @returns {string} the SVG
 */
export function renderRuins({ streak, week, days, level, label, showStats = true }) {
  const st = STATES[level];
  const rnd = new PyRandom(streak * 31 + 5);
  const { sc, depth } = buildScene();
  const parts = [svgOpen(label, BASE_CSS), sky(st.sky[0], st.sky[1], { horizon: GY, bands: 7, id: "d" })];

  // stars
  const stars = [];
  for (let i = 0; i < st.stars; i++) {
    const x = rnd.randint(52, 230);
    const y = rnd.randint(2, 26);
    if (st.name !== "ASHEN" || i % 2) {
      const bright = st.name === "ETERNAL" && i % 5 === 0;
      let g = `<rect x="${x}" y="${y}" width="1" height="1" fill="${bright ? "#fff6d8" : "#9aa3c8"}"/>`;
      const dur = 2 + rnd.random() * 3;
      const dl = -rnd.random() * 4;
      if (bright) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          g += `<rect x="${x + dx}" y="${y + dy}" width="1" height="1" fill="#8d8fb8"/>`;
        }
      }
      stars.push(`<g class="tw" style="${timing(dur, dl)}">${g}</g>`);
    }
  }

  // crescent moon
  const moon = new Layer();
  for (let x = 196; x < 203; x++) {
    for (let y = 6; y < 13; y++) {
      if ((x - 199) ** 2 + (y - 9) ** 2 <= 10 && (x - 201) ** 2 + (y - 8) ** 2 > 7) {
        moon.put(x, y, st.name !== "ASHEN" ? "#c9cbe0" : "#8b90a6");
      }
    }
  }
  parts.push(...stars, moon.paths(), sc.paths());

  // flickering firelight over the scene
  if (st.light) {
    const [color, R, strength] = st.light;
    const lit = litLayer(sc, depth, [{ x: FX, y: FB - 5, groundY: FB, R, strength, color }], { groundStretch: 3.2 });
    if (lit.size) parts.push(`<g class="lt">${lit.paths()}</g>`);
    const rings = haloRings({
      cx: FX,
      cy: FB - st.flame[0] * 0.45,
      R,
      color,
      bounds: (rr) => ({ x0: Math.trunc(FX - rr * 1.3), x1: Math.trunc(FX + rr * 1.3), y0: 0, y1: GY - 1 }),
    });
    parts.push(`<g class="lt">${rings.map((L, i) => `<g class="h${i}">${L.paths()}</g>`).join("")}</g>`);
  }
  const rune = buildRune(st);
  if (rune.size) parts.push(`<g class="rn">${rune.paths()}</g>`);
  parts.push(`<g class="cl">${buildCoals(st).paths()}</g>`);

  // smoke
  for (let i = 0; i < st.smoke; i++) {
    const x = FX - 2 + rnd.randint(-2, 2);
    const dx = rnd.randrange(4);
    const dur = 5 + rnd.random() * 3;
    const dl = i ? -i * 1.1 : 0; // like Python: -0 * 1.1 is 0.0, not -0.0
    parts.push(
      `<g class="sm${dx}" style="${timing(dur, dl)}">` +
        `<rect x="${x}" y="54" width="2" height="2" fill="#5d6170"/>` +
        `<rect x="${x + 1}" y="53" width="1" height="1" fill="#474a57"/></g>`,
    );
  }

  // the fire: 4 frames taking turns
  if (st.flame) {
    const [Hf, Wm] = st.flame;
    const frames = flameFrames({
      cx: FX,
      base: FB,
      Hf,
      Wm,
      pal: st.name === "ETERNAL" ? PAL_EPIC : PAL_WARM,
      seed: (f) => 100 + f * 17 + Hf,
      jitter: 1.1,
      tongues: 2 + Math.floor(Hf / 8),
    });
    parts.push(flameGroups(frames));
  }

  // embers
  const Hf = st.flame ? st.flame[0] : 4;
  const emberColors = ["#ffb347", "#ff8a2a", "#ffd27a", ...(st.name === "ETERNAL" ? ["#bfe6ff"] : [])];
  for (let i = 0; i < st.embers; i++) {
    const x = FX + rnd.randint(-Math.trunc(Hf / 3) - 1, Math.trunc(Hf / 3) + 1);
    const y = FB - rnd.randint(Math.trunc(Hf * 0.5), Hf);
    const dx = rnd.randrange(5);
    const c = rnd.choice(emberColors);
    const dur = 2.2 + rnd.random() * 2.2;
    const dl = -rnd.random() * 4;
    parts.push(`<rect class="em${dx}" style="${timing(dur, dl)}" x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`);
  }

  // HUD
  if (showStats) {
    const { frame, status } = hud({ streak, week, days, status: st.name, color: st.label });
    parts.push(frame.paths());
    parts.push(st.name === "ETERNAL" ? `<g class="st">${status.paths()}</g>` : status.paths());
  }
  parts.push("</svg>");
  return parts.join("");
}

