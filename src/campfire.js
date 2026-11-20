// From a username to SVG files: what the Action and the CLI share.

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { demoCalendar } from "./demo.js";
import { fetchCalendar } from "./github.js";
import { THEMES, renderCampfire } from "./render.js";
import { STATE_NAMES, parseThresholds, stateOf } from "./state.js";
import { computeStats, todayIn } from "./streak.js";

/** "true"/"false" (any case) → boolean. */
export function parseBoolean(value, name, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  const v = String(value).trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  throw new Error(`${name} must be "true" or "false", got "${value}".`);
}

/** Output paths separated by commas or new lines. */
export function parseOutputPaths(value, fallback = "dist/campfire.svg") {
  const paths = String(value || fallback)
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!paths.length) throw new Error("output_path is empty.");
  return paths;
}

/**
 * Read the calendar (or make one up), compute the streak and draw the scene.
 *
 * @param {object} o
 * @param {string} [o.user]
 * @param {string} [o.token]
 * @param {string} [o.theme]
 * @param {string} [o.timezone]
 * @param {boolean} [o.showStats]
 * @param {string} [o.thresholds]
 * @param {boolean} [o.demo] use a made-up calendar instead of the API
 * @param {number} [o.demoStreak]
 * @param {Date} [o.now]
 * @param {typeof fetch} [o.fetch]
 */
export async function buildCampfire({
  user,
  token,
  theme = "ruins",
  timezone = "UTC",
  showStats = true,
  thresholds,
  demo = false,
  demoStreak = 23,
  now = new Date(),
  fetch,
}) {
  if (!THEMES[theme]) throw new Error(`Unknown theme "${theme}". Available: ${Object.keys(THEMES).join(", ")}.`);
  const limits = parseThresholds(thresholds);
  const today = todayIn(timezone || "UTC", now);
  const calendar = demo
    ? demoCalendar({ today, streak: demoStreak })
    : await fetchCalendar(user, token, fetch ? { fetch } : undefined);
  const stats = computeStats(calendar, { today });
  const svg = renderCampfire({ theme, ...stats, showStats, thresholds: limits });
  return { svg, stats, state: STATE_NAMES[stateOf(stats.streak, limits)] };
}

/** Write the same SVG to every path, creating folders as needed. */
export async function writeOutputs(paths, svg) {
  for (const path of paths) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, svg, "utf8");
  }
}

/** An action input, read the way the runner exposes it. */
export function getInput(name, env = process.env) {
  return (env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`] ?? "").trim();
}

/**
 * Run the Action with the runner's environment.
 * @param {object} [env] process.env or a test double
 * @param {object} [deps] `fetch` and `now`, injectable for tests
 */
export async function runAction(env = process.env, { fetch, now } = {}) {
  const outputs = parseOutputPaths(getInput("output_path", env));
  const options = {
    user: getInput("github_user_name", env) || env.GITHUB_REPOSITORY_OWNER,
    token: getInput("github_token", env) || env.GITHUB_TOKEN,
    theme: getInput("theme", env) || "ruins",
    timezone: getInput("timezone", env) || "UTC",
    showStats: parseBoolean(getInput("show_stats", env), "show_stats"),
    thresholds: getInput("thresholds", env) || undefined,
  };

  const started = Date.now();
  const { svg, stats, state } = await buildCampfire({ ...options, fetch, now });
  await writeOutputs(outputs, svg);

  const kb = (svg.length / 1024).toFixed(1);
  console.log(`🔥 ${options.user}: ${stats.streak}-day streak (${state}), ${stats.week} contributions this week.`);
  for (const path of outputs) console.log(`   wrote ${path} (${kb} KB, theme ${options.theme})`);
  console.log(`   done in ${Date.now() - started} ms`);

  if (env.GITHUB_OUTPUT) {
    await appendFile(env.GITHUB_OUTPUT, `streak=${stats.streak}\nlongest=${stats.longest}\nstate=${state}\n`);
  }
  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      env.GITHUB_STEP_SUMMARY,
      `### 🔥 git-campfire\n\n| User | Streak | Longest | This week | State | Theme |\n| --- | --- | --- | --- | --- | --- |\n` +
        `| ${options.user} | ${stats.streak} | ${stats.longest} | ${stats.week} | ${state} | ${options.theme} |\n`,
    );
  }
  return { stats, state, outputs };
}
