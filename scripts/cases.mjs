// The sample stats used for snapshots, size checks and galleries: the same
// ones the prototype used for the approved sketches.

import { THEMES } from "../src/render.js";

const bits = (s) => [...s].map((c) => c === "1");

export const SAMPLES = [
  { state: "ashen", streak: 0, week: 0, days: bits("0000000") },
  { state: "kindled", streak: 2, week: 5, days: bits("0000111") },
  { state: "blazing", streak: 9, week: 23, days: bits("1111111") },
  { state: "eternal", streak: 23, week: 41, days: bits("1111111") },
];

/** Every theme in every state, with and without the HUD. */
export function allCases() {
  return Object.keys(THEMES).flatMap((theme) =>
    SAMPLES.flatMap((s) => [
      { name: `${theme}-${s.state}`, theme, ...s, showStats: true },
      { name: `${theme}-${s.state}-nohud`, theme, ...s, showStats: false },
    ]),
  );
}
