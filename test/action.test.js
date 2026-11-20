// The Action and the CLI, end to end with a mocked API.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import { getInput, parseBoolean, parseOutputPaths, runAction } from "../src/campfire.js";
import { addDays } from "../src/streak.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "campfire-"));
after(() => rmSync(dir, { recursive: true, force: true }));

/** A GraphQL answer with a streak of `streak` days ending on `today`. */
const api = (today, streak) => async () => ({
  status: 200,
  ok: true,
  headers: { get: () => null },
  json: async () => ({
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: [
              {
                contributionDays: Array.from({ length: 30 }, (_, i) => ({
                  date: addDays(today, i - 29),
                  contributionCount: i >= 30 - streak ? 2 : 0,
                })),
              },
            ],
          },
        },
      },
    },
  }),
});

test("inputs are read like the runner exposes them", () => {
  assert.equal(getInput("github_user_name", { INPUT_GITHUB_USER_NAME: "  octocat " }), "octocat");
  assert.equal(getInput("show_stats", {}), "");
  assert.deepEqual(parseOutputPaths("a.svg, b/c.svg\nd.svg"), ["a.svg", "b/c.svg", "d.svg"]);
  assert.deepEqual(parseOutputPaths(""), ["dist/campfire.svg"]);
  assert.equal(parseBoolean("FALSE", "x"), false);
  assert.throws(() => parseBoolean("yes", "show_stats"), /show_stats must be "true" or "false"/);
});

test("the Action writes every output, its outputs and a summary", async () => {
  const env = {
    INPUT_GITHUB_USER_NAME: "octocat",
    INPUT_GITHUB_TOKEN: "t",
    INPUT_THEME: "ruins",
    INPUT_OUTPUT_PATH: `${join(dir, "a", "campfire.svg")},${join(dir, "b.svg")}`,
    INPUT_TIMEZONE: "America/Bogota",
    INPUT_SHOW_STATS: "true",
    INPUT_THRESHOLDS: "1,4,15",
    GITHUB_OUTPUT: join(dir, "output.txt"),
    GITHUB_STEP_SUMMARY: join(dir, "summary.md"),
  };
  const now = new Date("2026-11-20T15:00:00Z");
  const { stats, state } = await runAction(env, { fetch: api("2026-11-20", 9), now });
  assert.equal(stats.streak, 9);
  assert.equal(state, "BLAZING");
  const a = readFileSync(join(dir, "a", "campfire.svg"), "utf8");
  assert.equal(a, readFileSync(join(dir, "b.svg"), "utf8"));
  assert.match(a, /^<svg [^>]*aria-label="git-campfire: a 9-day contribution streak, the fire is BLAZING">/);
  assert.match(readFileSync(env.GITHUB_OUTPUT, "utf8"), /streak=9\nlongest=9\nstate=BLAZING\n/);
  assert.match(readFileSync(env.GITHUB_STEP_SUMMARY, "utf8"), /\| octocat \| 9 \| 9 \| 14 \| BLAZING \| ruins \|/);
});

test("the Action fails with a clear message on bad inputs", async () => {
  const base = { INPUT_GITHUB_USER_NAME: "octocat", INPUT_GITHUB_TOKEN: "t", INPUT_OUTPUT_PATH: join(dir, "x.svg") };
  const run = (extra) => runAction({ ...base, ...extra }, { fetch: api("2026-11-20", 1) });
  await assert.rejects(run({ INPUT_THEME: "souls" }), /Unknown theme "souls"/);
  await assert.rejects(run({ INPUT_TIMEZONE: "Bogota" }), /Unknown time zone "Bogota"/);
  await assert.rejects(run({ INPUT_THRESHOLDS: "15,4,1" }), /Invalid thresholds/);
  await assert.rejects(run({ INPUT_SHOW_STATS: "maybe" }), /show_stats/);
});

test("action.yml declares every input the Action reads", () => {
  const yml = readFileSync(join(ROOT, "action.yml"), "utf8");
  for (const input of ["github_user_name", "github_token", "theme", "output_path", "timezone", "show_stats", "thresholds"]) {
    assert.match(yml, new RegExp(`\n  ${input}:\n`), input);
  }
  assert.match(yml, /using: "node24"\n  main: "src\/action.js"/);
});

test("the CLI renders a demo campfire without network", () => {
  const out = join(dir, "cli.svg");
  const log = execFileSync(process.execPath, [join(ROOT, "src/cli.js"), "--demo", "--streak", "0", "--week", "0", "--days", "0000000", "--out", out], {
    encoding: "utf8",
  });
  assert.match(log, /0-day streak \(ASHEN\)/);
  const svg = readFileSync(out, "utf8");
  // the same scene as the approved sketch, only the label differs
  const sketch = readFileSync(join(ROOT, "assets/ruins/ashen.svg"), "utf8");
  const strip = (s) => s.replace(/aria-label="[^"]*"/, "");
  assert.equal(strip(svg), strip(sketch));
});

test("the CLI explains its mistakes", () => {
  const fail = (...args) => {
    try {
      execFileSync(process.execPath, [join(ROOT, "src/cli.js"), ...args], { encoding: "utf8", stdio: "pipe" });
    } catch (err) {
      return err.stderr;
    }
    assert.fail("should have failed");
  };
  assert.match(fail(), /Pass --user <name>, or --demo/);
  assert.match(fail("--demo", "--days", "12"), /--days must be 7 digits/);
  assert.match(fail("--demo", "--streak=-1"), /--streak must be a whole number/);
});
