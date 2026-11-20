# Changelog

All notable changes to git-campfire are written down here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Next up: `void` and `cathedral` in their four states, accessibility and a self-updating gallery
([`v0.3.0`](https://github.com/FelipeBeltranING/git-campfire/milestone/3)).

## [0.2.0] - 2026-11-20

🔥 **The fire is lit.** The engine runs in JavaScript and the Action works with the `ruins` theme.

### Added

- The engine ported to plain JavaScript with zero dependencies: a random generator that reproduces
  Python's, pixel layers merged into one `<path>` per color, the dithered sky
  ([#10](https://github.com/FelipeBeltranING/git-campfire/issues/10)), depth lighting, halo rings and procedural flame frames ([#11](https://github.com/FelipeBeltranING/git-campfire/issues/11)), and the 3×5 font and the
  HUD, with big numbers kept inside the frame ([#12](https://github.com/FelipeBeltranING/git-campfire/issues/12)).
- The `ruins` theme in its four states, byte-identical to the approved art, and `show_stats` to hide
  the HUD ([#13](https://github.com/FelipeBeltranING/git-campfire/issues/13)).
- The contribution calendar read with one GraphQL query, clear errors for bad users, tokens and rate
  limits, and a demo calendar for offline previews ([#8](https://github.com/FelipeBeltranING/git-campfire/issues/8)).
- The streak with today's grace and a `timezone`, the week, the last 7 days and the longest streak
  ([#9](https://github.com/FelipeBeltranING/git-campfire/issues/9)).
- `action.yml` (`node24`) with the inputs `github_user_name`, `github_token`, `theme`, `output_path`,
  `timezone`, `show_stats` and `thresholds`, the outputs `streak`, `longest` and `state`, a run
  summary, and a CLI with the same options ([#16](https://github.com/FelipeBeltranING/git-campfire/issues/16)).
- An example workflow that publishes the SVG to an `output` branch, and a quick start in the README
  ([#17](https://github.com/FelipeBeltranING/git-campfire/issues/17)).
- Snapshots of every theme and state, and checks that every SVG stays under 100 KB with no scripts or
  external content ([#18](https://github.com/FelipeBeltranING/git-campfire/issues/18)).
- CI on Node 20 and 24: lint, tests and a size report in the job summary ([#19](https://github.com/FelipeBeltranING/git-campfire/issues/19)).

## [0.1.0] - 2026-11-20

🪵 **Prototype: the art and the reference engine.** The fire is drawn, but the Action is not ready yet.

### Added

- The approved reference art in `assets/`: `ruins` in its four states (ASHEN, KINDLED, BLAZING,
  ETERNAL), `void` (ASHEN and ETERNAL) and `cathedral` (ASHEN, BLAZING and ETERNAL), each with a
  preview, plus the `trail` exploration kept for later
  ([#3](https://github.com/FelipeBeltranING/git-campfire/issues/3)).
- The Python reference prototype in `prototype/`, standard library only, that regenerates all the art
  ([#2](https://github.com/FelipeBeltranING/git-campfire/issues/2)).
- The concept, the competitor research and the render spec in `docs/`
  ([#4](https://github.com/FelipeBeltranING/git-campfire/issues/4)).
- A README with the four fires, the three themes and the roadmap
  ([#5](https://github.com/FelipeBeltranING/git-campfire/issues/5)).
- A contributing guide, a code of conduct, a security policy, issue forms and a PR template
  ([#6](https://github.com/FelipeBeltranING/git-campfire/issues/6)).
- LF line endings for every text file, editor settings and ignores
  ([#1](https://github.com/FelipeBeltranING/git-campfire/issues/1)).

### Fixed

- The prototype wrote SVGs with CRLF endings on Windows. It now writes the same bytes on every OS
  ([#2](https://github.com/FelipeBeltranING/git-campfire/issues/2)).

[Unreleased]: https://github.com/FelipeBeltranING/git-campfire/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/FelipeBeltranING/git-campfire/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/FelipeBeltranING/git-campfire/releases/tag/v0.1.0
