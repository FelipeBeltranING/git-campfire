# Security policy

## Supported versions

git-campfire is in pre-release. Only the latest release gets fixes.

| Version | Supported |
| --- | --- |
| Latest `0.x` | ✅ |
| Older | ❌ |

## What matters here

The Action will read a GitHub token to query your contribution calendar and will write an SVG that other
people load in their browsers. The things worth reporting are, for example:

- A way for the Action to leak or misuse the token (logs, error messages, the SVG itself).
- A way to inject markup or script into the SVG through any input (a username, a theme option, data from
  the API).
- A dependency or workflow in this repo that could be abused.

## Reporting a vulnerability

**Please don't open a public issue.** Report it privately through GitHub:
**Security** tab → **Report a vulnerability**
([direct link](https://github.com/FelipeBeltranING/git-campfire/security/advisories/new)).

Include what you found, how to reproduce it and what an attacker could do with it. You will get an answer
within a week. Once it is fixed, the advisory will be published with credit to you, if you want it.
