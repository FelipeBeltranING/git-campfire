// Render every theme and state, print a size table (also to the job summary
// on GitHub Actions) and fail if any SVG is over the budget.
import { appendFileSync } from "node:fs";

import { renderCampfire } from "../src/render.js";
import { allCases } from "./cases.mjs";

const BUDGET = 100 * 1024;
let failed = 0;
const rows = allCases().map((c) => {
  const started = performance.now();
  const bytes = Buffer.byteLength(renderCampfire(c));
  const ms = performance.now() - started;
  const ok = bytes < BUDGET;
  if (!ok) failed++;
  return `| ${c.name} | ${(bytes / 1024).toFixed(1)} KB | ${ms.toFixed(0)} ms | ${ok ? "✅" : "❌ over 100 KB"} |`;
});
const table = ["| SVG | Size | Render | |", "| --- | --- | --- | --- |", ...rows].join("\n");
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### SVG sizes\n\n${table}\n`);
if (failed) {
  console.error(`${failed} SVG(s) over the 100 KB budget.`);
  process.exitCode = 1;
}
