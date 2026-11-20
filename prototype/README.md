# 🐍 Reference prototype (Python)

This is the small engine that drew every approved sketch in [`assets/`](../assets). It only uses the
Python 3 standard library.

It is **not** what the Action runs. It is the **visual reference** for the JavaScript port: the colors,
coordinates, palettes and tricks in here are the source of truth for the approved art. If the port and
the prototype disagree, the prototype wins (unless an issue says otherwise).

```bash
cd prototype
python3 generate_all.py                      # regenerates ../assets/** (ruins, void, cathedral, explorations/trail)
python3 render.py 23 41 out.svg 1111111      # ruins theme: streak, contributions this week, output, last 7 days
```

`generate_all.py` is deterministic: running it on a clean checkout produces no diff, on any OS.

## Files

| File | What it holds |
| --- | --- |
| `render.py` | The full **ruins** theme in its 4 states (`STATES`, `state_of`), the `Layer` class (pixels → one `<path>` per color), the dithered sky, the scene, depth lighting, flame frames, the 3×5 bitmap font (`FONT`), the HUD and the base CSS (`CSS`). |
| `options.py` | Shared helpers (`P`, `sky`, `stars`, `flame_frames`, `embers`, `halo`, `lit`, `sprite`, `hud`, `wrap`), the `SIT` and `STAND` sprites, the `PAL_WARM`, `PAL_EPIC` and `PAL_VOID` palettes, the **void** theme (`scene_void`) and the **trail** exploration (`scene_trail`). |
| `options3.py` | The **cathedral** theme (`scene_nave2(level)` with level 0, 2 or 3). |
| `generate_all.py` | Regenerates all the reference art. |

The code comments are in Spanish: it was written as a sketchbook. The spec in
[`docs/render-spec.md`](../docs/render-spec.md) explains the same techniques in English.

## Notes for the port

- What has to be ported is the drawing logic (`put` on a 240×80 grid), not the file layout. A
  `src/engine/` module (grid, paths, dithering, light, fire, particles, font) plus one file per theme
  works better.
- `random.Random(seed)` makes everything deterministic. Reproducing Python's generator in JavaScript
  (MT19937 with `random()`, `randint`, `randrange` and `choice`) lets the port be checked byte for byte
  against these files.
- `void` KINDLED and BLAZING, and `cathedral` KINDLED, do not exist yet. They have to be designed by
  interpolating flame size, light, embers and saturation (see [#14](https://github.com/FelipeBeltranING/git-campfire/issues/14) and [#15](https://github.com/FelipeBeltranING/git-campfire/issues/15)).
