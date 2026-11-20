# 🧮 Render spec

How a git-campfire SVG is built. Everything here is already solved in the
[Python prototype](../prototype), and the numbers below are the ones it uses. This is the reference for
the JavaScript port: if the two disagree, the prototype wins.

See also: [concept](concept.md) · [research](research.md)

## Contents

- [Canvas](#canvas)
- [Compatibility rules](#compatibility-rules)
- [Pixel layers and path merging](#pixel-layers-and-path-merging)
- [Sky](#sky)
- [Light](#light)
- [Fire](#fire)
- [Embers, smoke and stars](#embers-smoke-and-stars)
- [Bitmap font and HUD](#bitmap-font-and-hud)
- [The ruins states](#the-ruins-states)
- [Determinism](#determinism)
- [CSS classes](#css-classes)
- [Size budget](#size-budget)
- [Accessibility](#accessibility)
- [Performance](#performance)

## Canvas

- **240×80 logical pixels.** `viewBox="0 0 240 80"`, `width="720" height="240"` (scale 3).
- Pixel-perfect edges with `svg{shape-rendering:crispEdges}` in the CSS, not as an attribute.
- In `ruins`: the ground line is at `y = 62`, the fire is centered at `x = 120` with its base at `y = 61`.

## Compatibility rules

The SVG has to look the same inside an `<img>` on GitHub (served through camo) and in any other
renderer. So it is:

- **Self-contained:** no external fonts, no external `<image>`, no `foreignObject`.
- **Animated with CSS `@keyframes` only:** no JavaScript, no SMIL.
- **No CSS custom properties** (`var()`). To vary motion, use classes with variants (`em0..em4`) and
  per-element `style="animation-duration:…;animation-delay:…"`.

## Pixel layers and path merging

Every drawable is a **layer**: a map `(x, y) → color`, filled with `put(x, y, color)`. Pixels outside
the canvas are dropped.

Emitting one `<rect>` per pixel gave 500 KB SVGs. The layer is compressed instead:

1. **Horizontal runs:** contiguous pixels of the same color on a row become one run `(x, y, w)`.
2. **Vertical merge:** a run identical in `x` and `w` to one on the row right above it extends that
   one instead of opening a new rectangle.
3. **One `<path>` per color**, each rectangle written as `M{x} {y}h{w}v{h}h-{w}z`.

That brought the SVGs down to 25–65 KB for `ruins`.

The prototype has two implementations that emit colors in a different order, and a byte-identical port
has to keep both:

- `render.Layer.rects()` (`ruins`): scans rows top to bottom and left to right; colors come out in the
  order they are first met in that scan.
- `options.P.svg()` (`void`, `cathedral`, `trail`, and the shared HUD, halo and light helpers): groups
  pixels by `(color, row)` in insertion order, then sorts each color's runs by `(y, x)`; colors come out
  in the order their first pixel was `put`.

## Sky

Vertical bands of color from `top` to `bottom`, blended with `mix(top, bottom, b / (bands - 1))`. Between
two bands there is one 2-pixel-tall dithering row: a `<pattern>` with a 2×2 checkerboard of the previous
band's color over the new band.

- `ruins`: 7 bands from `y = 0` to the ground line (`y = 62`).
- `options.sky()`: 8 bands by default down to a given horizon, then a solid rectangle with the bottom
  color down to the bottom edge.

## Light

### Lit layer

A copy of the scene pixels tinted with the light color, precomputed and placed in a `.lt` group that
flickers (`1.3 s`, `step-end`). For each scene pixel, by depth:

| Depth | Distance `d` to the light | Strength factor `k` |
| --- | --- | --- |
| `ground` | `hypot(x − lx, (y − ly) × 3.2)` (3.0 in `options.lit`): a flattened ellipse | 1.0 |
| `prop` (near objects) | `hypot(x − lx, (y − ly) × 1.2)` | 1.15 |
| `bg` (everything else) | `hypot(x − lx, (y − ly) × 1.1) × 1.6` | 0.45 |

Then:

```
i   = max(0, 1 − d / R)
q   = i × 4 + (BAYER[y % 2][x % 2] − 0.4) × 0.6      BAYER = [[0, .5], [.75, .25]]
lvl = clamp(ceil(q), 0, 4) / 4
color = mix(pixel, light, min(0.9, lvl × strength × k))
```

Four levels plus a 2×2 ordered dither on their edges. In `ruins` the light sits at the fire's center,
5 px above its base for props and background. `options.lit()` takes several sources and keeps the
strongest one per pixel.

### Air halo

Three filled ellipses of the light color around the fire, with radius `R × .55`, `R × .35` and
`R × .2`, horizontally stretched by 1.25 (`sx`). Their outer 10 % is dithered on a checkerboard. They use
`fill-opacity` `.10`, `.12` and `.14` (classes `h0`, `h1`, `h2`) and sit together in a `.lt` group, so
they flicker with the light.

## Fire

**Four procedural frames** that take turns with `.fl` (`0.52 s`, `step-end`, each frame delayed by
`-0.13 s × i`). For each frame `f`, for each row `t` of the flame height `Hf` (`u = t / Hf`):

```
half-width  hw = Wm × (1 − u)^0.85 × min(1, (u + .22) × 2.4) + jitter
center      cx = FX + sin(u × 4.2 + f × π/2) × u × Wm × .35
```

Colors by position (`rel` = distance to the center / `hw`):

| Where | Color |
| --- | --- |
| `u > .78` (tip) | `tip` if `rel > .4`, else `outer` |
| `rel < .38` and `u < .62` | `core` (or `deep` at the very base, `u < .1` and `rel < .22`, if the palette has it) |
| `rel < .72` | `mid` |
| else | `outer` |

Plus a few loose tongues: single `outer` + `tip` pixel pairs a little above the flame.

| Palette | core | mid | outer | tip | deep |
| --- | --- | --- | --- | --- | --- |
| `PAL_WARM` (KINDLED, BLAZING) | `#fff1b0` | `#ffb53b` | `#f0611f` | `#a8301a` | none |
| `PAL_EPIC` (ETERNAL) | `#fff6d6` | `#ffd45a` | `#ff8a2a` | `#c0391d` | `#7ec8ff` |
| `PAL_VOID` (void) | `#f4ecff` | `#c9a2ff` | `#8a5cff` | `#4b2aa8` | `#9ff0ff` |

Under the flame, the **coals** on the logs pulse with `.cl` (`2.4 s`), dark red in ASHEN and orange
otherwise.

## Embers, smoke and stars

- **Embers:** 1 px `<rect>`s born in the upper half of the flame, each with a class `em0..em4` (five
  drift directions, from −8 px to +8 px sideways while rising 34 px), a random duration of 2.2–4.4 s and
  a random negative delay. Colors `#ffb347`, `#ff8a2a`, `#ffd27a`, plus `#bfe6ff` in ETERNAL. In `void`
  ETERNAL they use `bh0..bh2` instead and fly into the black hole.
- **Smoke:** small gray 2×2 puffs with `sm0..sm3` (6 s, rising 30 px), only when the fire is weak.
- **Stars:** `.tw` groups with a random duration (2–5 s) and delay. In ETERNAL some are bright, with a
  4-pixel cross around them.

## Bitmap font and HUD

The font is **3×5 pixels**, one 15-character string of `0`/`1` per glyph (rows top to bottom), with a
4 px advance. It covers `A–Z`, `0–9` and space; anything else draws as a space. See `FONT` in
`prototype/render.py`.

The HUD is a 44×33 frame at `(4, 4)` with the corners cut:

| Row (from the frame's top) | Content |
| --- | --- |
| `+3` | `STREAK` in the label color, the number at `x + 31` in the state color |
| `+10` | `WEEK`, the number at `x + 31` in `#d8d4ea` |
| `+17` | Seven 4×3 cells, 5 px apart: the state color if you contributed that day, `#24213a` if not |
| `+24` | The state name in the state color, blinking with `.st` in ETERNAL |

Default colors: frame `#3a3550`, background `#0b0a14`, labels `#6f6a8a`. Each theme passes its own.

## The ruins states

| | ASHEN | KINDLED | BLAZING | ETERNAL |
| --- | --- | --- | --- | --- |
| Streak | 0 | 1–3 | 4–14 | 15+ |
| State color | `#8a8f9e` | `#ffb35c` | `#ff9a3c` | `#ffd27a` |
| Sky (top → bottom) | `#07090f` → `#151b26` | `#080915` → `#171a2e` | `#080915` → `#1a1c33` | `#0a0816` → `#221a35` |
| Light (color, radius, strength) | none | `#ff8a3d`, 26, .45 | `#ff8a3d`, 46, .55 | `#ffb950`, 70, .62 |
| Flame (height, max half-width) | none | 9, 3.2 | 21, 6.5 | 34, 9.5 |
| Embers | 0 | 4 | 12 | 28 |
| Stars | 10 (half drawn) | 16 | 22 | 42 |
| Smoke puffs | 7 | 3 | 0 | 0 |
| Rune | off | `#5a3a2a` | `#c4612b` | `#ffe29a` |

## Determinism

The same data must always give the same SVG, so the image only changes when your streak does.

- `ruins`: everything random comes from `random.Random(streak × 31 + 5)`, and each flame frame from
  `random.Random(100 + f × 17 + Hf)`.
- `void` and `cathedral` use fixed seeds (`23` and `5`), and flame frames `Random(seed × 101 + f × 17 + Hf)`.
- In the prototype, `void` and `cathedral` draw fixed sample data (streak, week and days are hard-coded
  per state). The port has to feed them the real numbers.

The port reproduces Python's `random` (MT19937 with `random()`, `randint`, `randrange` and `choice`), so
its output can be compared byte for byte with the reference art.

## CSS classes

| Class | What it animates |
| --- | --- |
| `fl` | Flame frames (`.52 s`, `step-end`) |
| `lt` | Light and halo flicker (`1.3 s`, `step-end`) |
| `h0`, `h1`, `h2` | Halo ring opacity (static) |
| `cl` | Coals pulsing (`2.4 s`) |
| `tw` | Stars twinkling |
| `em0`–`em4` | Embers rising |
| `sm0`–`sm3` | Smoke rising |
| `rn` | The `ruins` rune glowing (`4 s`) |
| `st` | The state name blinking in ETERNAL (`2.2 s`) |
| `bob` | The `void` island and rocks floating 1 px |
| `k3` | The `void` disk spinning in 3 frames |
| `bh0`–`bh2` | `void` embers falling into the black hole |
| `au`, `ss`, `dr`, `sn` | Glows, shooting stars, drifting and falling particles |
| `fa`, `fb` | `cathedral` candle flames (two alternating frames) |
| `wf` | `cathedral` stained glass glowing |
| `mt` | `cathedral` dust drifting in the moonbeams |
| `vg`, `sh`, `sh2`, `pt` | `cathedral` vignette, moonbeams and colored patches (static opacity) |

## Size budget

**Under 100 KB per SVG**: it is downloaded on every profile view.

| Theme | Today |
| --- | --- |
| `ruins` | 24–66 KB ✅ |
| `void` | 33–71 KB ✅ |
| `cathedral` | 102–151 KB ❌ |

`cathedral` has to lose weight in the port: fewer noise textures on the walls, a coarser vignette and less
precision on the floor.

## Accessibility

- `role="img"` and an `aria-label` with the streak and the state.
- To do: an `@media (prefers-reduced-motion: reduce)` block that stops every animation and shows a still
  frame that still looks right.

## Performance

The Action has to run in **under 10 seconds** on `ubuntu-latest`. The plan is plain JavaScript with no
runtime dependencies on the Actions `node24` runtime, porting the prototype one to one.
