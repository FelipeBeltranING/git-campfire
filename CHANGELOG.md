# Changelog

All notable changes to git-campfire are written down here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Next up: the engine in JavaScript and a working Action with the `ruins` theme
([`v0.2.0`](https://github.com/FelipeBeltranING/git-campfire/milestone/2)).

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

[Unreleased]: https://github.com/FelipeBeltranING/git-campfire/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FelipeBeltranING/git-campfire/releases/tag/v0.1.0
