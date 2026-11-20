# Contributing to git-campfire 🔥

Thanks for wanting to sit by the fire! git-campfire is young: the Action works with the `ruins`
theme, and two more scenes are on their way. There is room for code, pixel art, docs and ideas.

## Setup

You only need Node 20+. There are no dependencies.

```bash
git clone https://github.com/FelipeBeltranING/git-campfire.git
cd git-campfire
npm test                                         # the node:test suite
node src/cli.js --demo --streak 9 --out demo.svg # a campfire with made-up data
node src/cli.js --help                           # all options
npm run lint                                     # every file parses, LF endings
npm run size                                     # every theme and state under 100 KB
```

Open any `.svg` in your browser to watch it burn.

### The art is tested byte for byte

- `test/ruins.test.js` renders `ruins` with the sketches' data and expects **exactly** the files in
  `assets/ruins/`. If it fails, you changed the art.
- `test/snapshots/` holds every theme in every state, with and without the HUD. After an intended
  change to the art, regenerate them with `npm run snapshots` and commit them with a screenshot.

### The Python prototype

The sketches were drawn by the Python prototype (standard library only). New themes and states are
usually sketched there first:

```bash
cd prototype
python3 generate_all.py               # redraw every scene in ../assets
python3 render.py 9 23 out.svg 1111111  # ruins: streak, contributions this week, output, last 7 days
```

A clean run of `generate_all.py` produces no diff.

## Where things live

| Path | What |
| --- | --- |
| [`src/engine/`](src/engine) | The renderer: random generator, layers, sky, light, fire, font, HUD |
| [`src/themes/`](src/themes) | One file per scene |
| [`src/`](src) | The calendar (`github.js`), the streak (`streak.js`), the Action and the CLI |
| [`test/`](test) | `node:test` suites and the SVG snapshots |
| [`assets/`](assets) | The approved art, one folder per theme, plus `explorations/` |
| [`prototype/`](prototype) | The Python engine that drew that art: the visual reference |
| [`docs/`](docs) | [Concept](docs/concept.md), [research](docs/research.md) and the [render spec](docs/render-spec.md) |

## Rules of the SVG

- **No JavaScript, no external anything.** GitHub serves README images through a proxy that strips
  scripts, so everything is CSS `@keyframes`. No external fonts or images, no `foreignObject`, no `var()`.
- **Pixel perfect.** Draw on the 240×80 grid with `put(x, y, color)`. Never use antialiased shapes.
- **Deterministic.** Use the seeded random generator, never an unseeded one: the same data must give
  the same SVG, byte for byte.
- **Mind the size.** Under 100 KB per SVG. It is downloaded on every profile view.
- **Reduced motion.** Anything you animate should still look right standing still (this becomes a test
  in [#21](https://github.com/FelipeBeltranING/git-campfire/issues/21)).

The details are in the [render spec](docs/render-spec.md).

## Original art only

This is a public repo inspired by the *atmosphere* of dark-fantasy games, never by their content. No
weapons, characters, armor, catchphrases or screenshots from existing games, and no themes named after
one. The traveler with the red scarf, the menhir and its rune, and the flame emblem are this project's
own. See [Intellectual property](docs/concept.md#5-intellectual-property).

## Designing a new state or theme 🎨

Design comes before code. Open an issue with the **Theme idea** form, sketch it (the prototype is the
quickest way: copy a `scene_*` function in `prototype/options.py`), attach a screenshot or the SVG, and
wait for the design to be approved before porting it.

## How we work

1. **Pick an issue** (or open one) and comment on it before you start, so nobody duplicates work.
2. **Branch** from `main` with a prefix: `feat/…`, `fix/…`, `docs/…`, `chore/…`, `ci/…`, `perf/…`, `refactor/…`.
3. **Commit** in small steps with [Conventional Commits](https://www.conventionalcommits.org):
   `feat:`, `fix:`, `docs:`, `chore:`, `ci:`, `test:`, `refactor:`, `perf:`, `style:`, with an optional scope
   (`feat(engine): …`, `docs(readme): …`). One idea per commit.
4. **Open a PR** that links its issue with `Closes #n`, and fill in the template.

Versions follow [semantic versioning](https://semver.org), and every release is written down in the
[changelog](CHANGELOG.md).

## Before you open a PR ✅

- [ ] The PR closes an issue (`Closes #n`).
- [ ] `npm test` passes.
- [ ] If the art changed on purpose, `npm run snapshots` was run and the snapshots are committed.
- [ ] If you touched the prototype, `generate_all.py` was run and the SVGs are committed.
- [ ] No SVG is over 100 KB.
- [ ] Visual changes have a screenshot or the SVG attached.

## What to work on

The [issues](https://github.com/FelipeBeltranING/git-campfire/issues) are the roadmap, grouped in
[milestones](https://github.com/FelipeBeltranING/git-campfire/milestones). Pick one by label:

| Label | What you'll do |
| --- | --- |
| [`good first issue`](https://github.com/FelipeBeltranING/git-campfire/labels/good%20first%20issue) | Small and well described. A good first log on the fire. |
| [`design`](https://github.com/FelipeBeltranING/git-campfire/labels/design) | Pixel art and scene design, sketched before code. |
| [`theme`](https://github.com/FelipeBeltranING/git-campfire/labels/theme) | A scene and its four fire states. |
| [`engine`](https://github.com/FelipeBeltranING/git-campfire/labels/engine) | The renderer: grid, paths, light, fire, particles, font. |
| [`data`](https://github.com/FelipeBeltranING/git-campfire/labels/data) | The contribution calendar and the streak math. |
| [`action`](https://github.com/FelipeBeltranING/git-campfire/labels/action) | `action.yml`, inputs and packaging. |
| [`ci`](https://github.com/FelipeBeltranING/git-campfire/labels/ci) | Workflows, tests and checks. |
| [`backlog`](https://github.com/FelipeBeltranING/git-campfire/labels/backlog) | Ideas for after `v1.0.0`. 👍 the ones you want. |

## Be kind

Everyone here follows the [code of conduct](CODE_OF_CONDUCT.md). Found a security problem? Please don't
open an issue: follow the [security policy](SECURITY.md).
