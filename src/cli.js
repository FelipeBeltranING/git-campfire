#!/usr/bin/env node
// Light a campfire from the command line.

import { parseArgs } from "node:util";

import { buildCampfire, parseBoolean, parseOutputPaths, writeOutputs } from "./campfire.js";
import { renderCampfire } from "./render.js";
import { STATE_NAMES, parseThresholds, stateOf } from "./state.js";

const HELP = `git-campfire: a pixel-art campfire that burns as long as your streak does.

Usage:
  node src/cli.js --user <name> [options]       real data (token: --token or GITHUB_TOKEN)
  node src/cli.js --demo [--streak 23] [options] made-up data, no network

Options:
  --user <name>          GitHub username
  --token <token>        token for the GraphQL API (default: GITHUB_TOKEN)
  --theme <name>         ruins (default)
  --out <path[,path]>    where to write the SVG (default: dist/campfire.svg)
  --timezone <iana>      decides what "today" is (default: UTC)
  --show-stats <bool>    draw the HUD (default: true)
  --thresholds <a,b,c>   where KINDLED, BLAZING and ETERNAL start (default: 1,4,15)
  --demo                 use a made-up calendar
  --streak <n>           with --demo: the streak to end on (default: 23)
  --week <n>             with --demo: set the WEEK number directly
  --days <bits>          with --demo: the last 7 days, oldest first, e.g. 0011111
  -h, --help             show this help
`;

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      user: { type: "string" },
      token: { type: "string" },
      theme: { type: "string", default: "ruins" },
      out: { type: "string", default: "dist/campfire.svg" },
      timezone: { type: "string", default: "UTC" },
      "show-stats": { type: "string", default: "true" },
      thresholds: { type: "string" },
      demo: { type: "boolean", default: false },
      streak: { type: "string" },
      week: { type: "string" },
      days: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (!values.demo && !values.user) throw new Error("Pass --user <name>, or --demo for made-up data. See --help.");

  const showStats = parseBoolean(values["show-stats"], "--show-stats");
  const outputs = parseOutputPaths(values.out);
  const toInt = (v, name) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a whole number, got "${v}".`);
    return n;
  };

  let svg;
  let stats;
  let state;
  if (values.demo && (values.week !== undefined || values.days !== undefined)) {
    // Exact stats, e.g. to reproduce the sketches: --streak 9 --week 23 --days 1111111
    const days = values.days ?? "1111111";
    if (!/^[01]{7}$/.test(days)) throw new Error(`--days must be 7 digits of 0 and 1, got "${days}".`);
    stats = {
      streak: toInt(values.streak ?? 23, "--streak"),
      week: toInt(values.week ?? 41, "--week"),
      days: [...days].map((c) => c === "1"),
    };
    const limits = parseThresholds(values.thresholds);
    state = STATE_NAMES[stateOf(stats.streak, limits)];
    svg = renderCampfire({ theme: values.theme, ...stats, showStats, thresholds: limits });
  } else {
    ({ svg, stats, state } = await buildCampfire({
      user: values.user,
      token: values.token ?? process.env.GITHUB_TOKEN,
      theme: values.theme,
      timezone: values.timezone,
      showStats,
      thresholds: values.thresholds,
      demo: values.demo,
      demoStreak: values.streak === undefined ? 23 : toInt(values.streak, "--streak"),
    }));
  }
  await writeOutputs(outputs, svg);
  const who = values.demo ? "demo" : values.user;
  console.log(`🔥 ${who}: ${stats.streak}-day streak (${state}), ${stats.week} this week → ${outputs.join(", ")} (${(svg.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(`git-campfire: ${err.message}`);
  process.exitCode = 1;
});
