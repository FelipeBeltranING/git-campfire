// Reading the contribution calendar, and the demo calendar.
import assert from "node:assert/strict";
import { test } from "node:test";

import { demoCalendar } from "../src/demo.js";
import { GRAPHQL_URL, fetchCalendar } from "../src/github.js";
import { computeStats } from "../src/streak.js";

const TODAY = "2026-11-20";

const reply = (status, body, headers = {}) => async () => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k] },
  json: async () => body,
});

const calendarBody = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: [
            { contributionDays: [{ date: "2026-11-15", contributionCount: 0 }, { date: "2026-11-16", contributionCount: 3 }] },
            { contributionDays: [{ date: "2026-11-14", contributionCount: 1 }] },
          ],
        },
      },
    },
  },
};

test("fetchCalendar sends one GraphQL query and flattens the weeks", async () => {
  let call;
  const fetch = async (url, init) => {
    call = { url, init };
    return reply(200, calendarBody)();
  };
  const days = await fetchCalendar("octocat", "t0ken", { fetch });
  assert.equal(call.url, GRAPHQL_URL);
  assert.equal(call.init.headers.Authorization, "bearer t0ken");
  assert.deepEqual(JSON.parse(call.init.body).variables, { login: "octocat" });
  assert.deepEqual(days, [
    { date: "2026-11-14", count: 1 },
    { date: "2026-11-15", count: 0 },
    { date: "2026-11-16", count: 3 },
  ]);
});

test("fetchCalendar explains what went wrong", async () => {
  await assert.rejects(fetchCalendar("bad user!", "t", { fetch: reply(200, calendarBody) }), /not a valid GitHub username/);
  await assert.rejects(fetchCalendar("octocat", "", { fetch: reply(200, calendarBody) }), /token is required/);
  await assert.rejects(fetchCalendar("octocat", "t", { fetch: reply(401, {}) }), /rejected the token/);
  await assert.rejects(
    fetchCalendar("octocat", "t", { fetch: reply(403, {}, { "x-ratelimit-reset": "1795000000" }) }),
    /rate limit.*Try again after 2026/,
  );
  await assert.rejects(fetchCalendar("octocat", "t", { fetch: reply(502, {}) }), /HTTP 502/);
  await assert.rejects(
    fetchCalendar("ghost-user", "t", { fetch: reply(200, { data: { user: null }, errors: [{ type: "NOT_FOUND", message: "x" }] }) }),
    /"ghost-user" was not found/,
  );
  await assert.rejects(
    fetchCalendar("octocat", "t", {
      fetch: async () => {
        throw new Error("offline");
      },
    }),
    /Could not reach the GitHub API: offline/,
  );
});


test("the demo calendar ends with the requested streak", () => {
  for (const streak of [0, 2, 9, 23, 120]) {
    const s = computeStats(demoCalendar({ today: TODAY, streak }), { today: TODAY });
    assert.equal(s.streak, streak);
  }
  assert.equal(demoCalendar({ today: TODAY }).length, 365);
});
