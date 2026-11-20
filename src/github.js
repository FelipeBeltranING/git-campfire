// Read a user's contribution calendar with one GraphQL query.
//
// Contributions, not commits: commits, PRs, issues and reviews, exactly what
// the graph on a GitHub profile counts. One query brings the whole year.

export const GRAPHQL_URL = "https://api.github.com/graphql";

const QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

/**
 * @param {string} login GitHub username
 * @param {string} token a token that can read public profile data
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch] injectable for tests
 * @returns {Promise<Array<{date: string, count: number}>>} sorted by date
 */
export async function fetchCalendar(login, token, { fetch: fetchImpl = globalThis.fetch } = {}) {
  if (!login || !LOGIN.test(login)) throw new Error(`"${login ?? ""}" is not a valid GitHub username.`);
  if (!token) {
    throw new Error("A GitHub token is required to read the contribution calendar (github_token, or GITHUB_TOKEN locally).");
  }

  let res;
  try {
    res = await fetchImpl(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "git-campfire",
      },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
    });
  } catch (err) {
    throw new Error(`Could not reach the GitHub API: ${err.message}`);
  }

  if (res.status === 401) throw new Error("GitHub rejected the token (401). Check github_token.");
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers?.get?.("x-ratelimit-reset");
    const when = reset ? ` Try again after ${new Date(Number(reset) * 1000).toISOString()}.` : "";
    throw new Error(`GitHub API rate limit or permission error (${res.status}).${when}`);
  }
  if (!res.ok) throw new Error(`GitHub API error: HTTP ${res.status}.`);

  const body = await res.json();
  if (body.errors?.length) {
    if (body.errors.some((e) => e.type === "NOT_FOUND")) throw new Error(`GitHub user "${login}" was not found.`);
    throw new Error(`GitHub API error: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  const weeks = body.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!body.data?.user) throw new Error(`GitHub user "${login}" was not found.`);
  if (!Array.isArray(weeks)) throw new Error("Unexpected answer from the GitHub API: no contribution calendar.");

  return weeks
    .flatMap((w) => w.contributionDays)
    .map((d) => ({ date: d.date, count: d.contributionCount }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
