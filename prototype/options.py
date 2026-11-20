"""git-campfire — 3 conceptos alternativos de escena (bocetos).

B: Sendero de hogueras  — un brasero por cada uno de los últimos 14 días.
D: Hoguera en el vacío — isla flotante en el espacio frente a un agujero negro.
"""
import math
import random
import sys

from render import FONT, mix, noise, CSS as BASE_CSS

W, H = 240, 80


# ---------------------------------------------------------------- pixeles -> <path>
class P(dict):
    """Diccionario (x,y)->color; recorta al lienzo salvo wide=True."""

    def __init__(self, wide=False):
        super().__init__()
        self.wide = wide

    def put(self, x, y, c):
        x, y = int(x), int(y)
        if self.wide or (0 <= x < W and 0 <= y < H):
            if 0 <= y < H:
                self[(x, y)] = c

    def svg(self, attrs=""):
        rows = {}
        for (x, y), c in self.items():
            rows.setdefault((c, y), []).append(x)
        bycol = {}
        for (c, y), xs in rows.items():
            xs.sort()
            start = prev = xs[0]
            for x in xs[1:] + [None]:
                if x is not None and x == prev + 1:
                    prev = x
                    continue
                bycol.setdefault(c, []).append((start, y, prev - start + 1))
                if x is not None:
                    start = prev = x
        out = []
        for c, runs in bycol.items():
            runs.sort(key=lambda r: (r[1], r[0]))
            open_, done = {}, []
            for (x, y, w) in runs:
                k = (x, w, y)
                if k in open_:
                    r = open_.pop(k); r[3] += 1; open_[(x, w, y + 1)] = r
                else:
                    r = [x, y, w, 1]; done.append(r); open_[(x, w, y + 1)] = r
            d = "".join(f"M{x} {y}h{w}v{h}h-{w}z" for x, y, w, h in done)
            out.append(f'<path fill="{c}" d="{d}"/>')
        return "".join(out)


def sky(top, bot, horizon, bands=8, pid="s"):
    out, defs = [], []
    bh = horizon / bands
    for b in range(bands):
        y0, y1 = round(b * bh), round((b + 1) * bh)
        out.append(f'<rect x="0" y="{y0}" width="{W}" height="{y1 - y0}" fill="{mix(top, bot, b / (bands - 1))}"/>')
        if b:
            pc = mix(top, bot, (b - 1) / (bands - 1))
            defs.append(f'<pattern id="{pid}{b}" width="2" height="2" patternUnits="userSpaceOnUse">'
                        f'<rect width="1" height="1" fill="{pc}"/><rect x="1" y="1" width="1" height="1" fill="{pc}"/></pattern>')
            out.append(f'<rect x="0" y="{y0}" width="{W}" height="2" fill="url(#{pid}{b})"/>')
    out.append(f'<rect x="0" y="{round(horizon)}" width="{W}" height="{H - round(horizon)}" fill="{bot}"/>')
    return "<defs>" + "".join(defs) + "</defs>" + "".join(out)


def stars(rnd, n, box, cols=("#9aa3c8",), bright_every=0, bright="#fff6d8"):
    x0, y0, x1, y1 = box
    out = []
    for i in range(n):
        x, y = rnd.randint(x0, x1), rnd.randint(y0, y1)
        b = bright_every and i % bright_every == 0
        g = f'<rect x="{x}" y="{y}" width="1" height="1" fill="{bright if b else rnd.choice(cols)}"/>'
        if b:
            g += "".join(f'<rect x="{x + dx}" y="{y + dy}" width="1" height="1" fill="#7f82a8"/>'
                         for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)])
        out.append(f'<g class="tw" style="animation-duration:{2 + rnd.random() * 3:.1f}s;'
                   f'animation-delay:{-rnd.random() * 4:.1f}s">{g}</g>')
    return "".join(out)


# ---------------------------------------------------------------- fuego
PAL_WARM = ("#fff1b0", "#ffb53b", "#f0611f", "#a8301a", None)
PAL_EPIC = ("#fff6d6", "#ffd45a", "#ff8a2a", "#c0391d", "#7ec8ff")
PAL_VOID = ("#f4ecff", "#c9a2ff", "#8a5cff", "#4b2aa8", "#9ff0ff")


def flame_frames(cx, base, Hf, Wm, pal, seed=0, n=4):
    core, mid, out, tip, deep = pal
    frames = []
    for f in range(n):
        rnd = random.Random(seed * 101 + f * 17 + Hf)
        L = P()
        phase = f * math.pi / 2
        for t in range(Hf):
            u = t / Hf
            hw = Wm * (1 - u) ** 0.85 * min(1, (u + .22) * 2.4) + (rnd.random() - .5) * min(1.1, Wm * .35)
            c0 = cx + math.sin(u * 4.2 + phase) * u * Wm * .35
            for x in range(int(c0 - hw - 1), int(c0 + hw + 2)):
                rel = abs(x + .5 - c0) / max(hw, .6)
                if rel > 1:
                    continue
                if u > .78:
                    c = tip if rel > .4 else out
                elif rel < .38 and u < .62:
                    c = deep if (deep and u < .1 and rel < .22) else core
                elif rel < .72:
                    c = mid
                else:
                    c = out
                L.put(x, base - t, c)
        for _ in range(1 + Hf // 8):
            tx = int(cx + (rnd.random() - .5) * Wm * 1.2)
            ty = base - Hf - rnd.randint(0, 3)
            L.put(tx, ty, out)
            L.put(tx, ty - 1, tip)
        frames.append(L)
    return "".join(f'<g class="fl" style="animation-delay:-{i * .13:.2f}s">{fr.svg()}</g>'
                   for i, fr in enumerate(frames))


def embers(rnd, cx, base, Hf, n, cols, cls="em", variants=5, rise=None):
    out = []
    for _ in range(n):
        x = cx + rnd.randint(-max(1, Hf // 3), max(1, Hf // 3))
        y = base - rnd.randint(int(Hf * .5), max(int(Hf * .5) + 1, Hf))
        k = rnd.randrange(variants)
        out.append(f'<rect class="{cls}{k}" style="animation-duration:{2.2 + rnd.random() * 2.2:.1f}s;'
                   f'animation-delay:{-rnd.random() * 4:.1f}s" x="{x}" y="{y}" width="1" height="1" fill="{rnd.choice(cols)}"/>')
    return "".join(out)


def halo(cx, cy, R, col, sx=1.25):
    out = []
    for lvl, rr in enumerate([R * .55, R * .35, R * .2]):
        L = P()
        for y in range(int(cy - rr) - 1, int(cy + rr) + 2):
            for x in range(int(cx - rr * sx) - 1, int(cx + rr * sx) + 2):
                e = math.hypot((x - cx) / sx, y - cy) / rr
                if e <= 1 and not (e > .9 and (x + y) % 2):
                    L.put(x, y, col)
        out.append(f'<g class="h{lvl}">{L.svg()}</g>')
    return f'<g class="lt">{"".join(out)}</g>'


def lit(scene, depth, sources):
    """sources: (x, y, R, strength, color). Ilumina por profundidad con 4 niveles y dithering."""
    L = P()
    for (x, y), c in scene.items():
        dep = depth.get((x, y), "bg")
        best, bcol = 0, None
        for (sx, sy, R, st, col) in sources:
            if dep == "ground":
                d = math.hypot(x - sx, (y - sy) * 3.0); k = 1.0
            elif dep == "prop":
                d = math.hypot(x - sx, (y - sy) * 1.2); k = 1.15
            else:
                d = math.hypot(x - sx, (y - sy) * 1.1) * 1.6; k = .45
            i = max(0.0, 1 - d / R)
            q = i * 4 + ([[0, .5], [.75, .25]][y % 2][x % 2] - .4) * .6
            lvl = max(0, min(4, math.ceil(q))) / 4 if i > 0 else 0
            v = lvl * st * k
            if v > best:
                best, bcol = v, col
        if best > 0:
            L[(x, y)] = mix(c, bcol, min(.9, best))
    return f'<g class="lt">{L.svg()}</g>'


# ---------------------------------------------------------------- sprites
SIT = [
    "....hhhh.....",
    "...hccccc....",
    "..hccCCcccw..",
    "..hcCffffcw..",
    "..hcCffefcw..",
    "..hccffffcw..",
    "..sssssssscw.",
    ".hccsscccCcw.",
    ".hcccccccccCw",
    ".hccccccccCCw",
    "hcccccccccCcw",
    "hcccckkkkkkcw",
    "hcccckkkkkk.w",
    ".hcccbb..bb.w",
    "..hhhbb..bb.w",
]
STAND = [
    "...hhh....",
    "..hcccc...",
    "..hcCff...",
    "..hcCfe...",
    "..hccff...",
    ".sssssss..",
    "hcccscccc.",
    "hccccccCc.",
    "hccccccCc.",
    "hcccccccc.",
    "hcccccccc.",
    ".hccccccc.",
    ".hcccccc..",
    "..cc.cc...",
    "..bb.bb...",
    "..bb.bb...",
]
SPAL = dict(h="#141220", c="#34304a", C="#4a4466", f="#0c0b12", e="#2a2633", s="#6e2727",
            k="#3e3958", b="#221c19", w="#4d3b27")


def sprite(L, rows, ox, oy, flip=False, pal=SPAL, eye=None):
    wd = max(len(r) for r in rows)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in pal:
                x = ox + (wd - 1 - i if flip else i)
                c = eye if (ch == "e" and eye) else pal[ch]
                L.put(x, oy + j, c)


def text(L, s, x, y, col):
    for ch in s.upper():
        g = FONT.get(ch, FONT[" "])
        for i, b in enumerate(g):
            if b == "1":
                L.put(x + i % 3, y + i // 3, col)
        x += 4
    return x


def hud(streak, week, days, status, scol, x0=4, y0=4, frame="#3a3550", bg="#0b0a14", lab="#6f6a8a", blink=False):
    L, T = P(), P()
    w, h = 44, 33
    for x in range(x0, x0 + w):
        for y in range(y0, y0 + h):
            bd = x in (x0, x0 + w - 1) or y in (y0, y0 + h - 1)
            if bd and (x in (x0, x0 + w - 1)) and (y in (y0, y0 + h - 1)):
                continue
            L.put(x, y, frame if bd else bg)
    text(L, "STREAK", x0 + 3, y0 + 3, lab)
    text(L, str(streak), x0 + 31, y0 + 3, scol)
    text(L, "WEEK", x0 + 3, y0 + 10, lab)
    text(L, str(week), x0 + 31, y0 + 10, "#d8d4ea")
    for i, d in enumerate(days):
        for dx in range(4):
            for dy in range(3):
                L.put(x0 + 3 + i * 5 + dx, y0 + 17 + dy, scol if d else "#24213a")
    text(T, status, x0 + 3, y0 + 24, scol)
    return L.svg() + (f'<g class="st">{T.svg()}</g>' if blink else T.svg())


# ---------------------------------------------------------------- CSS extra
CSS = BASE_CSS + """
.fa{animation:fa 1.2s step-end infinite}.fb{animation:fb 1.2s step-end infinite}
@keyframes fa{0%{opacity:1}50%{opacity:0}}@keyframes fb{0%{opacity:0}50%{opacity:1}}
.dr{animation:dr 60s linear infinite}
@keyframes dr{from{transform:translate(0,0)}to{transform:translate(-240px,0)}}
.sn{animation:sn 7s steps(60) infinite;opacity:0}
@keyframes sn{0%{opacity:0;transform:translate(0,0)}8%{opacity:.9}100%{opacity:.4;transform:translate(8px,78px)}}
.bh0,.bh1,.bh2{opacity:0}
.bh0{animation:bh0 4s steps(32) infinite}.bh1{animation:bh1 4s steps(32) infinite}.bh2{animation:bh2 4s steps(32) infinite}
@keyframes bh0{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}70%{opacity:.9}100%{opacity:0;transform:translate(78px,-34px)}}
@keyframes bh1{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}70%{opacity:.9}100%{opacity:0;transform:translate(70px,-26px)}}
@keyframes bh2{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(10px,-30px)}}
.bob{animation:bob 4s step-end infinite}
@keyframes bob{0%{transform:translate(0,0)}50%{transform:translate(0,-1px)}}
.au{animation:au 5s ease-in-out infinite}
@keyframes au{0%,100%{opacity:.25}50%{opacity:.75}}
.ss{animation:ss 9s linear infinite;opacity:0}
@keyframes ss{0%,86%{opacity:0;transform:translate(0,0)}88%{opacity:1}96%{opacity:0;transform:translate(-46px,16px)}100%{opacity:0}}
.k3{opacity:0;animation:k3 .9s step-end infinite}
@keyframes k3{0%{opacity:1}33.3%{opacity:0}}
.wf{animation:wf 6s ease-in-out infinite}
@keyframes wf{0%,100%{opacity:.5}50%{opacity:1}}
"""


def wrap(parts, label, inline):
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W * 3}" height="{H * 3}" '
            f'role="img" aria-label="{label}">')
    return head + ("" if inline else f"<style>{CSS}</style>") + "".join(parts) + "</svg>"


# ================================================================ B · Sendero de hogueras
def scene_trail(epic, inline=False):
    rnd = random.Random(7)
    levels = [2, 3, 1, 4, 2, 3, 4, 2, 1, 3, 4, 4, 3, 4] if epic else [2, 3, 0, 4, 2, 1, 3, 0, 2, 1, 3, 1, 0, 0]
    streak, week = (23, 41) if epic else (0, 7)
    parts = [sky("#0a0814", "#3a1b33" if epic else "#1d1626", 60, pid="b")]
    # luna de sangre baja
    moon = P()
    for x in range(180, 210):
        for y in range(8, 38):
            d2 = (x - 195) ** 2 + (y - 22) ** 2
            if d2 <= 11 ** 2:
                c = "#8a3236" if epic else "#3e2c36"
                if noise(x, y, 6) > .8:
                    c = "#76292e" if epic else "#36262f"
                moon.put(x, y, c)
            elif d2 <= 14 ** 2 and (x + y) % 2 == 0:
                moon.put(x, y, "#2a1222" if epic else "#1a1420")
    parts.append(moon.svg())
    parts.append(stars(rnd, 34 if epic else 14, (50, 2, 236, 22), bright_every=6 if epic else 0))
    scene, depth = P(), {}
    # castillo lejano sobre colina
    for x in range(W):
        top = int(52 + 4 * math.sin(x / 23 + .5) + 2 * math.sin(x / 9))
        if 110 < x < 190:
            top = min(top, int(47 - 3 * math.cos((x - 150) / 26)))
        for y in range(top, 64):
            scene.put(x, y, "#140d19")
    castle = "#1c1222"
    for (x0, x1, top) in [(128, 134, 30), (135, 165, 38), (146, 152, 22), (166, 172, 32), (158, 161, 28)]:
        for x in range(x0, x1 + 1):
            for y in range(top, 48):
                scene.put(x, y, castle)
            if (x - x0) % 2 == 0:
                scene.put(x, top - 1, castle)
    for i in range(6):                                  # agujas
        scene.put(149 - i // 3, 21 - i, castle); scene.put(149 + i // 3, 21 - i, castle)
    for x, y in [(131, 34), (149, 26), (169, 36), (140, 42), (156, 41)]:   # ventanas
        scene.put(x, y, "#e8a24a" if epic else "#2a1d2e")
    for k in scene:
        depth[k] = "bg"
    # camino empedrado
    for y in range(62, H):
        for x in range(W):
            if y < 71:
                c = "#2a2430" if ((x + (y // 3) * 4) % 8 and y % 3) else "#1f1a25"
            else:
                c = "#15111a" if noise(x, y, 4) < .92 else "#1c1722"
            scene.put(x, y, c)
            depth[(x, y)] = "ground"
    # braseros
    bx = [10 + i * 13 for i in range(14)]
    fires, srcs = [], []
    for i, (x, lv) in enumerate(zip(bx, levels)):
        for y in range(57, 64):
            for dx in (-1, 0, 1):
                scene.put(x + dx, y, "#3a3444" if dx < 1 else "#2b2633")
                depth[(x + dx, y)] = "prop"
        for dx in range(-3, 4):
            scene.put(x + dx, 56, "#4a4255"); depth[(x + dx, 56)] = "prop"
            if abs(dx) < 3:
                scene.put(x + dx, 55, "#2b2633" if abs(dx) == 2 else "#1a1520"); depth[(x + dx, 55)] = "prop"
        scene.put(x - 3, 55, "#4a4255"); scene.put(x + 3, 55, "#4a4255")
        if lv:
            Hf, Wm = [0, 3, 5, 7, 9][lv], [0, 1.2, 1.6, 2.1, 2.6][lv]
            fires.append(flame_frames(x, 54, Hf, Wm, PAL_EPIC if (epic and lv == 4) else PAL_WARM, seed=i))
            fires.append(embers(rnd, x, 54, Hf, lv, ["#ffb347", "#ffd27a"]))
            srcs.append((x, 54, 6 + lv * 3, .5, "#ff8a3d"))
        else:
            fires.append(f'<g class="cl"><rect x="{x - 1}" y="54" width="1" height="1" fill="#5a2a1e"/>'
                         f'<rect x="{x + 1}" y="54" width="1" height="1" fill="#4a241a"/></g>')
    # hoguera final (hoy) + viajero
    FX, FB = 210, 61
    for i in range(10):
        scene.put(205 + i, 61 - i // 5, "#3b2717"); scene.put(215 - i, 61 - i // 5, "#4a311c")
        depth[(205 + i, 61 - i // 5)] = depth[(215 - i, 61 - i // 5)] = "prop"
    sp = P()
    sprite(sp, SIT, 221, 62 - len(SIT), flip=True)
    for k, c in sp.items():
        scene[k] = c; depth[k] = "prop"
    parts.append(scene.svg())
    if epic:
        srcs.append((FX, 55, 60, .6, "#ffb950"))
        parts.append(lit(scene, depth, srcs))
        parts.append(halo(FX, 46, 60, "#ffb950"))
        parts.append(flame_frames(FX, FB, 26, 7.5, PAL_EPIC, seed=99))
        parts.append(embers(rnd, FX, FB, 26, 20, ["#ffb347", "#ffd27a", "#bfe6ff"]))
    else:
        parts.append(lit(scene, depth, srcs))
        parts.append('<g class="cl"><rect x="207" y="59" width="2" height="1" fill="#8a2a1a"/>'
                     '<rect x="212" y="58" width="1" height="1" fill="#8a2a1a"/></g>')
        for i in range(5):
            parts.append(f'<g class="sm{i % 4}" style="animation-duration:6s;animation-delay:{-i * 1.2:.1f}s">'
                         f'<rect x="{209 + i % 2}" y="55" width="2" height="2" fill="#5d6170"/></g>')
    parts += fires
    parts.append(hud(streak, week, [l > 0 for l in levels[-7:]], "ETERNAL" if epic else "ASHEN",
                     "#ffd27a" if epic else "#8a8f9e", blink=epic))
    return wrap(parts, f"Sendero de hogueras, racha {streak}", inline)


# ================================================================ D · Hoguera en el vacío
def scene_void(epic, inline=False):
    rnd = random.Random(23)
    streak, week = (23, 41) if epic else (0, 0)
    parts = [f'<rect width="{W}" height="{H}" fill="#04030a"/>']
    # nebulosa difusa (tablero de baja opacidad)
    neb = P()
    for x in range(0, W):
        for y in range(0, H):
            v = math.exp(-(((x - 150) / 70) ** 2 + ((y - 30) / 28) ** 2)) + .6 * math.exp(-(((x - 40) / 40) ** 2 + ((y - 60) / 20) ** 2))
            lv = 3 if v > .75 else 2 if v > .5 else 1 if v > .3 else 0
            if lv and not (v % .25 < .02 and (x + y) % 2):
                cols = ["#0b0718", "#110a22", "#180d2e"] if epic else ["#07060d", "#09080f", "#0b0a12"]
                neb.put(x, y, cols[lv - 1])
    parts.append(neb.svg())
    parts.append(stars(rnd, 70 if epic else 40, (0, 0, 239, 79), cols=("#8890c0", "#c0a0ff", "#7fb8ff", "#5a6088"),
                       bright_every=9 if epic else 0))
    # agujero negro con disco de acreción (3 frames que giran)
    BX, BY, R0 = 186, 34, 9
    hot = ["#fff4d6", "#ffd27a", "#ff9a3c", "#c4502a"] if epic else ["#7a7590", "#5a5670", "#403d55", "#2a2838"]

    def disk(front, phase):
        L = P()
        for a in range(0, 360, 2):
            ang = math.radians(a)
            for rr in [x * .5 for x in range(22, 58)]:
                x = BX + rr * math.cos(ang)
                y = BY + rr * math.sin(ang) * .22
                if (math.sin(ang) > 0) != front:
                    continue
                band = (rr - 11) / 18
                shade = (math.cos(ang) + 1) / 2                      # doppler: lado izquierdo más brillante
                stripe = .5 + .5 * math.sin(rr * 1.3 - phase + a / 25)
                v = (1 - band) * .7 + (1 - shade) * .3 + stripe * .15
                idx = 0 if v > .85 else 1 if v > .65 else 2 if v > .45 else 3
                L.put(round(x), round(y), hot[idx])
        return L

    def lensed(phase):
        L = P()
        for a in range(180, 361, 2):
            ang = math.radians(a)
            for rr in [x * .5 for x in range(22, 34)]:
                x = BX + rr * math.cos(ang)
                y = BY + rr * math.sin(ang) * .95
                stripe = .5 + .5 * math.sin(rr * 1.3 - phase + a / 25)
                v = (1 - (rr - 11) / 6) * .7 + stripe * .2
                L.put(round(x), round(y), hot[1 if v > .6 else 2 if v > .35 else 3])
        return L

    if epic:
        parts.append(halo(BX, BY, 60, "#ff9a3c", sx=1.6))
    for f in range(3):
        ph = f * 2.1
        back = disk(False, ph)
        parts.append(f'<g class="k3" style="animation-delay:-{f * .3:.1f}s">{lensed(ph).svg()}{back.svg()}</g>')
    hole = P()
    for x in range(BX - R0 - 2, BX + R0 + 3):
        for y in range(BY - R0 - 2, BY + R0 + 3):
            d = math.hypot(x - BX, y - BY)
            if d <= R0:
                hole.put(x, y, "#000000")
            elif d <= R0 + 1.2:
                hole.put(x, y, "#ffe9c0" if epic else "#5a5670")
    parts.append(hole.svg())
    for f in range(3):
        parts.append(f'<g class="k3" style="animation-delay:-{f * .3:.1f}s">{disk(True, f * 2.1).svg()}</g>')
    # isla flotante
    scene, depth = P(), {}
    IX, ITOP = 92, 54
    for x in range(56, 129):
        half = 36
        u = (x - IX) / half
        if abs(u) > 1:
            continue
        top = ITOP + (1 if abs(u) > .9 else 0)
        bot = ITOP + 3 + int(22 * (1 - u * u) ** 1.3 + 3 * noise(x // 3, 5))
        for y in range(top, bot):
            if y <= top + 1:
                c = "#2a4a36" if epic else "#24332c"
            else:
                strata = (y - top + int(2 * math.sin(x / 6))) // 4 % 3
                c = ["#2a2433", "#231e2c", "#1b1723"][strata]
                if noise(x, y, 9) > .9:
                    c = "#3a3046"
            scene.put(x, y, c)
            depth[(x, y)] = "ground" if y <= top + 1 else "bg"
    # cristales / runas en la roca
    for (x, y) in [(84, 62), (85, 63), (101, 60), (102, 61), (93, 68)]:
        scene.put(x, y, "#9ff0ff" if epic else "#3a4a5a"); depth[(x, y)] = "prop"
    # pilar roto sobre la isla
    for x in range(64, 68):
        for y in range(40 + int(noise(x, 3) * 4), ITOP):
            scene.put(x, y, "#2e2a3c" if x > 64 else "#3a3550"); depth[(x, y)] = "prop"
    # troncos + viajero
    for i in range(10):
        scene.put(98 + i, 53 - i // 5, "#3b2717"); scene.put(108 - i, 53 - i // 5, "#4a311c")
        depth[(98 + i, 53 - i // 5)] = depth[(108 - i, 53 - i // 5)] = "prop"
    sp = P()
    sprite(sp, SIT, 80, 54 - len(SIT), eye="#9ff0ff" if epic else None)
    for k, c in sp.items():
        scene[k] = c; depth[k] = "prop"
    FX, FB = 103, 53
    island = [scene.svg()]
    if epic:
        island.append(lit(scene, depth, [(FX, 47, 48, .6, "#c9a2ff")]))
        island.append(halo(FX, 40, 48, "#b48cff"))
        island.append(flame_frames(FX, FB, 24, 7, PAL_VOID, seed=3))
    else:
        island.append('<g class="cl"><rect x="101" y="51" width="2" height="1" fill="#5a3a8a"/>'
                      '<rect x="105" y="52" width="1" height="1" fill="#4a2a6a"/></g>')
    parts.append(f'<g class="bob">{"".join(island)}</g>')
    # rocas flotantes pequeñas
    for i, (x, y, w) in enumerate([(40, 48, 4), (140, 64, 5), (30, 70, 3), (150, 52, 3), (20, 40, 2)]):
        R = P()
        for dx in range(w):
            R.put(x + dx, y, "#2a4a36" if epic else "#24332c")
            for dy in range(1, max(2, w - abs(dx - w // 2))):
                R.put(x + dx, y + dy, "#231e2c")
        parts.append(f'<g class="bob" style="animation-delay:-{i * .7:.1f}s;animation-duration:{3 + i * .6:.1f}s">{R.svg()}</g>')
    # chispas: las del fuego caen hacia el agujero negro
    if epic:
        out = []
        for _ in range(26):
            x = FX + rnd.randint(-3, 3)
            y = FB - rnd.randint(10, 24)
            k = rnd.choice([0, 0, 1, 1, 2])
            out.append(f'<rect class="bh{k}" style="animation-duration:{3 + rnd.random() * 2.5:.1f}s;animation-delay:'
                       f'{-rnd.random() * 5:.1f}s" x="{x}" y="{y}" width="1" height="1" fill="{rnd.choice(["#e8d0ff", "#9ff0ff", "#c9a2ff"])}"/>')
        parts += out
    else:
        for i in range(4):
            parts.append(f'<g class="sm{i % 4}" style="animation-duration:7s;animation-delay:{-i * 1.6:.1f}s">'
                         f'<rect x="{102 + i % 2}" y="48" width="2" height="2" fill="#4a4660"/></g>')
    parts.append(hud(streak, week, [epic] * 7, "ETERNAL" if epic else "ASHEN",
                     "#c9a2ff" if epic else "#8a8f9e", frame="#3a2a5a", bg="#08050f", lab="#7a6a98", blink=epic))
    return wrap(parts, f"Hoguera en el vacio, racha {streak}", inline)


SCENES = {"B": scene_trail, "D": scene_void}

if __name__ == "__main__":
    import os
    os.makedirs("out", exist_ok=True)
    for k, fn in SCENES.items():
        for epic in (False, True):
            p = f"out/{k}_{'eternal' if epic else 'ashen'}.svg"
            s = fn(epic)
            open(p, "w").write(s)
            print(p, len(s) // 1024, "KB")
