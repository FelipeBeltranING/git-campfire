# 🔥 Concept

> A GitHub Action that draws a night scene in your README: a traveler resting by a campfire that burns
> as bright as your contribution streak. Stop contributing and the fire goes out. Keep at it and it blazes.

**Author:** David Felipe Beltrán Tabares ([@FelipeBeltranING](https://github.com/FelipeBeltranING)) ·
**License:** MIT

See also: [research](research.md) (what already exists and why this is different) and the
[render spec](render-spec.md) (how the SVG is built).

## Where it comes from

git-campfire is the sister project of [GitFarm](https://github.com/FelipeBeltranING/gitfarm). Same
philosophy (an Action that writes an animated SVG for your README), different idea:

| | GitFarm | git-campfire |
| --- | --- | --- |
| Time of day | Day | Night |
| What it reads | The whole contribution graph | Your **streak**: consistency |
| The feeling | A farm that grows with your work | A ritual: resting by the fire you keep alive |

A third project, *Commit Horizon* (space), is planned to close the trilogy. The `void` theme is the
bridge to it.

## 1. The scene

The scene is the product, not a stats card. A dark-fantasy night (solitude, ruins, rest, embers rising
into the dark) with the project's own character: a **hooded traveler with a red scarf**, sitting by a
campfire.

The fire has four states, decided by the current streak:

| State | Streak | What you see |
| --- | --- | --- |
| `ASHEN` | 0 days | Logs with pulsing coals, gray smoke rising, a cold and dark scene |
| `KINDLED` | 1–3 days | A small warm flame and a faint light around it |
| `BLAZING` | 4–14 days | A real campfire, embers rising, warm light on the ground and the props nearby |
| `ETERNAL` | 15+ days | A tall flame with a white-gold core and a blue base, a big halo, lots of embers, more stars, and the state name blinks |

The **HUD** in the top-left corner is drawn with a 3×5 pixel font and shows `STREAK <n>`,
`WEEK <contributions in the last 7 days>`, seven cells (one per day of the last week, lit if you
contributed that day) and the state name.

## 2. Themes

The previews live in [`assets/<theme>/preview.png`](../assets) and the animated SVGs next to them.

### `ruins` (default)

Night ruins: broken pillars, a wall with an arch, a dead tree, a crescent moon and far hills.

- **Centerpiece:** a menhir with a rune that lights up with the state: off in ASHEN, copper in KINDLED, orange in BLAZING and pale gold in ETERNAL.
- **Traveler:** sitting left of the fire with a staff. Their eye reflects the flame when there is one.
- **Light by depth:** the ground gets the full light in a flattened ellipse, nearby props 115 % and the background 45 %. It is quantized to 4 levels with ordered dithering, and the whole group flickers.
- **Status:** all 4 states done.

### `void`

A floating island of rock in front of a **black hole** with an accretion disk, a photon ring and the
back of the disk lensed over the horizon.

- **Violet fire.** In ETERNAL, **the embers fly into the black hole**.
- The disk spins in 3 frames with a doppler effect (the left side is brighter). In ASHEN it is gray and cold.
- The island bobs 1 px, surrounded by small floating rocks. Crystals in the rock glow cyan in ETERNAL, over a low-contrast nebula.
- **Status:** ASHEN and ETERNAL done. **To design:** KINDLED and BLAZING, interpolating between them.

### `cathedral`

The nave of a ruined gothic cathedral.

- **Palette:** cold blue-violet stone under the moonlight against the gold of the fire. The gold wins ground as the streak grows.
- **Depth:** round pillars at three distances, pointed arches with dark side aisles and lancet windows, and a floor of flagstones in perspective with its vanishing point at (120, 30).
- **Rose window** with 12 lobes and stained glass: broken and dark in ASHEN, half-saturated in BLAZING, full color and glowing in ETERNAL.
- **Moonbeams** with floating dust. In ETERNAL, **the stained glass casts its colors on the floor**.
- **Seven candles on the altar are your last 7 days:** lit if you contributed that day.
- **Details:** ivy, crimson banners with a flame emblem, a broken chandelier, rubble and a vignette.
- **Status:** ASHEN, BLAZING and ETERNAL done. **To design:** KINDLED.
- **Watch the weight:** 100–150 KB today, it has to be slimmed down (see the [render spec](render-spec.md#size-budget)).

### Not picked: `trail`

A path with 14 braziers, one per day of the last two weeks, each burning by that day's contributions.
It did not make the cut, but it is kept in [`assets/explorations/trail`](../assets/explorations/trail)
as a possible future theme. Other explorations (a cliff, a constellation, a tiny planet) were dropped.

## 3. Data and rules

- **Source:** a single GraphQL query, `user(login) { contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } } }`. It brings the whole year, enough for the current and the longest streak.
- **Contributions, not commits:** commits, PRs, issues and reviews, just like GitHub's graph.
- **Current streak:** consecutive days with a contribution, ending today.
- **Today's grace:** if there is no contribution today yet, the streak counts up to yesterday and is not broken.
- **Time zone:** the `timezone` input (for example `America/Bogota`) decides what "today" is. Without it, a cron in UTC would break streaks at 7 p.m. in Colombia.
- **WEEK:** the sum of contributions in the last 7 days. **Cells / candles:** `count > 0` for each day.
- **Thresholds:** 0 / 1–3 / 4–14 / 15+, configurable with an advanced input `thresholds: "1,4,15"`.

## 4. Planned inputs (`action.yml`)

| Input | Default | Description |
| --- | --- | --- |
| `github_user_name` | `${{ github.repository_owner }}` | Whose contributions feed the fire |
| `github_token` | `${{ github.token }}` | Token for GraphQL |
| `theme` | `ruins` | `ruins`, `void` or `cathedral` |
| `output_path` | `dist/campfire.svg` | Where to write the SVG (a list is allowed, like snk) |
| `timezone` | `UTC` | IANA time zone that decides what "today" is |
| `show_stats` | `true` | Show or hide the HUD |
| `thresholds` | `1,4,15` | Advanced: where KINDLED, BLAZING and ETERNAL start |

**Publishing:** like snk and GitFarm, the example workflow pushes the SVG to an `output` branch and the
README points to `raw.githubusercontent.com/<user>/<user>/output/campfire.svg`, so the bot's commits
never touch `main`.

## 5. Intellectual property

This is a public repo. The inspiration is the **atmosphere** of dark-fantasy games, never their content.

- Nothing taken from existing games: no iconic weapons stuck in the fire, no game catchphrases or
  on-screen messages, no armor or characters from other works, no theme named after a game, and no
  game screenshots anywhere in the repo.
- Everything here is original: the hooded traveler with the red scarf, the menhir with its rune, the
  flame emblem on the banners and every scene.

New art and new themes follow the same rule. When in doubt, open an issue first.

## 6. Ideas past v1

1. **Permanent progression:** the longest streak unlocks things that stay even when the fire goes out (7 / 30 / 100 / 365 days: a banner, rebuilt ruins, a second traveler…).
2. **Heat that decays:** a missed day weakens the fire instead of putting it out at once, as an optional `mode: heat`.
3. **The `trail` theme** (braziers for the last 14 days), if people ask for it.
4. **A live web generator** like GitFarm's: type a username, pick a theme, copy the snippet.
5. **The trilogy:** GitFarm (day) → git-campfire (night) → Commit Horizon (space), linked from each README.

The full plan lives in the [milestones](https://github.com/FelipeBeltranING/git-campfire/milestones).
