"""git-campfire — boceto del motor: escena pixel art -> SVG animado autocontenido.

Uso:  python3 render.py <racha> <contribuciones_semana> <salida.svg> [d1..d7 como 1011101]
"""
import math
import random
import sys

W, H, S = 240, 80, 3          # lienzo lógico 240x80, cada pixel = 3 px reales
GY = 62                        # línea del suelo
FX, FB = 120, 61               # centro y base del fuego

# ---------------------------------------------------------------- estados
def state_of(streak):
    if streak == 0:
        return 0
    if streak <= 3:
        return 1
    if streak <= 14:
        return 2
    return 3

STATES = {
    0: dict(name="ASHEN",   label_col="#8a8f9e", sky=("#07090f", "#151b26"), light=None,
            flame=None, embers=0, stars=10, smoke=7, rune=None),
    1: dict(name="KINDLED", label_col="#ffb35c", sky=("#080915", "#171a2e"), light=("#ff8a3d", 26, .45),
            flame=(9, 3.2), embers=4, stars=16, smoke=3, rune="#5a3a2a"),
    2: dict(name="BLAZING", label_col="#ff9a3c", sky=("#080915", "#1a1c33"), light=("#ff8a3d", 46, .55),
            flame=(21, 6.5), embers=12, stars=22, smoke=0, rune="#c4612b"),
    3: dict(name="ETERNAL", label_col="#ffd27a", sky=("#0a0816", "#221a35"), light=("#ffb950", 70, .62),
            flame=(34, 9.5), embers=28, stars=42, smoke=0, rune="#ffe29a"),
}

# ---------------------------------------------------------------- utilidades de color
def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))

def rgb(t):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in t)

def mix(a, b, k):
    a, b = hx(a), hx(b)
    return rgb(tuple(a[i] + (b[i] - a[i]) * k for i in range(3)))

# ---------------------------------------------------------------- capa de pixeles
class Layer(dict):
    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self[(x, y)] = c

    def rects(self):
        """Fusiona pixeles contiguos del mismo color en tiras y emite un <path> por color."""
        runs = {}
        for y in range(H):
            x = 0
            while x < W:
                c = self.get((x, y))
                if c is None:
                    x += 1
                    continue
                x0 = x
                while x < W and self.get((x, y)) == c:
                    x += 1
                runs.setdefault(c, []).append((x0, y, x - x0))
        out = []
        for c, rs in runs.items():
            # fusión vertical: tiras iguales en filas consecutivas
            open_, done = {}, []
            for (x, y, w) in rs:
                k = (x, w, y)
                if k in open_:
                    r = open_.pop(k); r[3] += 1; open_[(x, w, y + 1)] = r
                else:
                    r = [x, y, w, 1]; done.append(r); open_[(x, w, y + 1)] = r
            d = "".join(f"M{x} {y}h{w}v{h}h-{w}z" for x, y, w, h in done)
            out.append(f'<path fill="{c}" d="{d}"/>')
        return "".join(out)


DEPTH = {}   # (x,y) -> "bg" | "ground" | "prop"

# ---------------------------------------------------------------- escena estática
def noise(x, y, seed=7):
    n = (x * 374761393 + y * 668265263 + seed * 2147483647) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return (n & 0xFFFF) / 0xFFFF

def build_sky_svg(st):
    top, bot = st["sky"]
    bands, out, defs = 7, [], []
    bh = GY / bands
    for b in range(bands):
        y0, y1 = round(b * bh), round((b + 1) * bh)
        c = mix(top, bot, b / (bands - 1))
        out.append(f'<rect x="0" y="{y0}" width="{W}" height="{y1 - y0}" fill="{c}"/>')
        if b:   # fila de dithering entre bandas
            pc = mix(top, bot, (b - 1) / (bands - 1))
            defs.append(f'<pattern id="d{b}" width="2" height="2" patternUnits="userSpaceOnUse">'
                        f'<rect width="1" height="1" fill="{pc}"/><rect x="1" y="1" width="1" height="1" fill="{pc}"/></pattern>')
            out.append(f'<rect x="0" y="{y0}" width="{W}" height="2" fill="url(#d{b})"/>')
    return "<defs>" + "".join(defs) + "</defs>" + "".join(out)

def build_scene(st):
    sc = Layer()
    DEPTH.clear()
    rnd = random.Random(42)
    # colinas lejanas
    for x in range(W):
        top = int(53 + 3 * math.sin(x / 17) + 2 * math.sin(x / 7 + 1))
        for y in range(top, GY):
            sc.put(x, y, "#0e1120")
    # ruinas: pilares rotos y muro con arco
    ruin, edge = "#171b2e", "#20253c"

    def pillar(x0, x1, top):
        for x in range(x0, x1 + 1):
            t = top + int(noise(x, 3) * 4)
            for y in range(t, GY):
                c = edge if x == x0 else ruin
                if (y - t) % 7 == 0 and y > t:      # juntas de bloques
                    c = "#131628"
                sc.put(x, y, c)
        for x in range(x0 - 1, x1 + 2):           # capitel
            sc.put(x, top + 6, edge)

    pillar(28, 33, 32)
    pillar(44, 48, 47)
    pillar(214, 219, 30)
    pillar(228, 231, 50)
    # muro con arco
    wx0, wx1, ax0, ax1, ay = 158, 204, 170, 192, 44
    acx, ar = (ax0 + ax1) / 2, (ax1 - ax0) / 2
    for x in range(wx0, wx1 + 1):
        top = 27 + int(noise(x, 9) * 6) + (4 if x > 196 else 0)
        for y in range(top, GY):
            inside_arch = ax0 <= x <= ax1 and (y >= ay or (x - acx) ** 2 + ((y - ay) * 1.15) ** 2 <= ar ** 2)
            window = 176 <= x <= 186 and 31 <= y <= 36 and False
            if inside_arch or window:
                continue
            c = ruin
            if (y - top) % 6 == 0:
                c = "#131628"
            if (x + (y // 6) * 3) % 9 == 0:
                c = "#131628"
            if x == wx0 or y == top:
                c = edge
            sc.put(x, y, c)
    # árbol muerto (esquina derecha)
    tree = "#0b0c15"
    for y in range(0, GY):
        x = 236 + int(math.sin(y / 9) * 1.5)
        for dx in range(-1, 2 if y > 40 else 1):
            sc.put(x + dx, y, tree)
    def branch(x, y, dx, dy, n):
        for i in range(n):
            sc.put(int(x), int(y), tree)
            x += dx + (rnd.random() - .5) * .6
            y += dy + (rnd.random() - .5) * .6
    branch(236, 14, -1.2, -.4, 22)
    branch(236, 24, -1.0, -.7, 16)
    branch(222, 9, -1.0, .5, 9)
    branch(214, 4, -1.1, .3, 14)
    for k in sc:
        DEPTH[k] = "bg"
    # suelo
    for y in range(GY, H):
        for x in range(W):
            n = noise(x, y, 3)
            c = "#17140f" if n < .95 else "#1f1a13"
            if y > 73:
                c = "#100e0b"
            sc.put(x, y, c)
            DEPTH[(x, y)] = "ground"
    for x in range(W):                            # pasto
        if noise(x, 1, 11) > .55:
            sc.put(x, GY - 1, "#16211a")
            if noise(x, 2, 11) > .8:
                sc.put(x, GY - 2, "#16211a")
    for k in sc:
        DEPTH.setdefault(k, "ground")
    # menhir con runa (objeto central propio)
    mx = 137
    for y in range(37, GY):
        half = 3 if y > 40 else 3 - (40 - y) // 2
        for x in range(mx - half, mx + half + 1):
            c = "#2a2c3b" if x != mx - half else "#33364a"
            if noise(x, y, 5) > .93:
                c = "#232532"
            sc.put(x, y, c)
    # piedras alrededor del fuego
    for sx, sy, w in [(108, 60, 3), (112, 61, 2), (127, 61, 2), (130, 60, 3), (115, 62, 3), (124, 62, 3), (119, 62, 3)]:
        for i in range(w):
            sc.put(sx + i, sy, "#3a3a44")
            sc.put(sx + i, sy + 1, "#2b2b33")
    # troncos cruzados
    for i in range(14):
        sc.put(113 + i, 60 - i // 5, "#3b2717")
        sc.put(113 + i, 61 - i // 5, "#2a1b10")
        sc.put(127 - i, 60 - i // 5, "#4a311c")
        sc.put(127 - i, 61 - i // 5, "#2f1f12")
    # viajero sentado (personaje propio: capa con capucha y bufanda)
    sprite = [
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
    pal = dict(h="#141220", c="#34304a", C="#4a4466", f="#0c0b12", e="#2a2633", s="#6e2727",
               k="#3e3958", b="#221c19", w="#4d3b27")
    ox, oy = 92, GY - len(sprite) + 1
    for j, row in enumerate(sprite):
        for i, ch in enumerate(row):
            if ch in pal:
                sc.put(ox + i, oy + j, pal[ch])
    for k in sc:
        DEPTH.setdefault(k, "prop")
    return sc

def build_rune(st):
    """La runa del menhir: brilla según el estado."""
    r = Layer()
    if not st["rune"]:
        return r
    for (x, y) in [(137, 42), (137, 43), (137, 44), (137, 45), (137, 46), (137, 47), (137, 48),
                   (136, 43), (138, 45), (136, 47), (138, 47), (136, 49), (138, 49)]:
        r.put(x, y, st["rune"])
    return r

def build_light(st, scene):
    """Capa iluminada: tinte cálido cuantizado en 4 niveles, según profundidad."""
    lit = Layer()
    if not st["light"]:
        return lit
    col, R, strength = st["light"]
    ly = FB - 5
    for (x, y), c in scene.items():
        dep = DEPTH.get((x, y), "bg")
        if dep == "ground":
            d = math.hypot(x - FX, (y - FB) * 3.2)
            k = 1.0
        elif dep == "prop":
            d = math.hypot(x - FX, (y - ly) * 1.2)
            k = 1.15
        else:
            d = math.hypot(x - FX, (y - ly) * 1.1) * 1.6
            k = .45
        i = max(0.0, 1 - d / R)
        if i <= 0:
            continue
        # dithering en los bordes de cada nivel
        q = i * 4 + ([[0, .5], [.75, .25]][y % 2][x % 2] - .4) * .6
        lvl = max(0, min(4, math.ceil(q))) / 4
        if lvl > 0:
            lit[(x, y)] = mix(c, col, min(.9, lvl * strength * k))
    return lit

def build_flame_frames(st, nframes=4):
    if not st["flame"]:
        return []
    Hf, Wm = st["flame"]
    epic = st["name"] == "ETERNAL"
    if epic:
        core, mid, out, tip = "#fff6d6", "#ffd45a", "#ff8a2a", "#c0391d"
        deep = "#7ec8ff"
    else:
        core, mid, out, tip = "#fff1b0", "#ffb53b", "#f0611f", "#a8301a"
        deep = None
    frames = []
    for f in range(nframes):
        rnd = random.Random(100 + f * 17 + Hf)
        L = Layer()
        phase = f * math.pi / 2
        for t in range(Hf):
            u = t / Hf
            hw = Wm * (1 - u) ** 0.85 * min(1, (u + .22) * 2.4)
            hw += (rnd.random() - .5) * 1.1
            cx = FX + math.sin(u * 4.2 + phase) * u * Wm * .35
            y = FB - t
            for x in range(int(cx - hw - 1), int(cx + hw + 2)):
                rel = abs(x + .5 - cx) / max(hw, .6)
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
                L.put(x, y, c)
        # lenguas sueltas sobre la punta
        for _ in range(2 + Hf // 8):
            tx = int(FX + (rnd.random() - .5) * Wm * 1.2)
            ty = FB - Hf - rnd.randint(0, 3)
            L.put(tx, ty, out)
            L.put(tx, ty - 1, tip)
        frames.append(L)
    return frames

def build_coals(st):
    """Brasas sobre los troncos (siempre presentes, pulsan)."""
    L = Layer()
    for x, y in [(116, 59), (119, 58), (121, 59), (124, 58), (118, 60), (122, 60)]:
        L.put(x, y, "#b8361c" if st["name"] == "ASHEN" else "#ff7a2a")
    return L

# ---------------------------------------------------------------- fuente bitmap 3x5
FONT = {
    "A": "010101111101101", "B": "110101110101110", "C": "011100100100011", "D": "110101101101110",
    "E": "111100110100111", "F": "111100110100100", "G": "011100101101011", "H": "101101111101101",
    "I": "111010010010111", "J": "001001001101010", "K": "101101110101101", "L": "100100100100111",
    "M": "101111111101101", "N": "110101101101101", "O": "010101101101010", "P": "110101110100100",
    "Q": "010101101110011", "R": "110101110101101", "S": "011100010001110", "T": "111010010010010",
    "U": "101101101101111", "V": "101101101101010", "W": "101101111111101", "X": "101101010101101",
    "Y": "101101010010010", "Z": "111001010100111", " ": "000000000000000",
    "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
    "4": "101101111001001", "5": "111100110001110", "6": "011100111101111", "7": "111001010010010",
    "8": "111101111101111", "9": "111101111001110",
}

def text(layer, s, x, y, col):
    for ch in s.upper():
        g = FONT.get(ch, FONT[" "])
        for i, b in enumerate(g):
            if b == "1":
                layer.put(x + i % 3, y + i // 3, col)
        x += 4
    return x

def build_hud(st, streak, week, days):
    hud = Layer()
    x0, y0, w, h = 4, 4, 44, 33
    for x in range(x0, x0 + w):
        for y in range(y0, y0 + h):
            border = x in (x0, x0 + w - 1) or y in (y0, y0 + h - 1)
            corner = (x in (x0, x0 + w - 1)) and (y in (y0, y0 + h - 1))
            if corner:
                continue
            hud.put(x, y, "#3a3550" if border else "#0b0a14")
    lab, val = "#6f6a8a", st["label_col"]
    text(hud, "STREAK", x0 + 3, y0 + 3, lab)
    text(hud, str(streak), x0 + 3 + 7 * 4, y0 + 3, val)
    text(hud, "WEEK", x0 + 3, y0 + 10, lab)
    text(hud, str(week), x0 + 3 + 7 * 4, y0 + 10, "#d8d4ea")
    # últimos 7 días como celdas
    for i, d in enumerate(days):
        cx = x0 + 3 + i * 5
        for dx in range(4):
            for dy in range(3):
                hud.put(cx + dx, y0 + 17 + dy, val if d else "#24213a")
    return hud, (x0 + 3, y0 + 24)

# ---------------------------------------------------------------- SVG
CSS = """
.fl{opacity:0;animation:fl .52s step-end infinite}
@keyframes fl{0%{opacity:1}25%{opacity:0}100%{opacity:0}}
.lt{animation:lt 1.3s step-end infinite}
@keyframes lt{0%{opacity:1}18%{opacity:.84}35%{opacity:.96}52%{opacity:.8}70%{opacity:.93}86%{opacity:.88}}
.cl{animation:cl 2.4s ease-in-out infinite}
@keyframes cl{0%,100%{opacity:.45}50%{opacity:1}}
.tw{animation:tw 3s ease-in-out infinite}
@keyframes tw{0%,100%{opacity:.25}50%{opacity:1}}
.em0{animation:em0 3s steps(24) infinite;opacity:0}
@keyframes em0{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(-8px,-34px)}}
.em1{animation:em1 3s steps(24) infinite;opacity:0}
@keyframes em1{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(-4px,-34px)}}
.em2{animation:em2 3s steps(24) infinite;opacity:0}
@keyframes em2{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(0px,-34px)}}
.em3{animation:em3 3s steps(24) infinite;opacity:0}
@keyframes em3{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(4px,-34px)}}
.em4{animation:em4 3s steps(24) infinite;opacity:0}
@keyframes em4{0%{opacity:0;transform:translate(0,0)}10%{opacity:1}100%{opacity:0;transform:translate(8px,-34px)}}
.sm0{animation:sm0 6s steps(30) infinite;opacity:0}
@keyframes sm0{0%{opacity:0;transform:translate(0,0)}15%{opacity:.55}100%{opacity:0;transform:translate(-6px,-30px)}}
.sm1{animation:sm1 6s steps(30) infinite;opacity:0}
@keyframes sm1{0%{opacity:0;transform:translate(0,0)}15%{opacity:.55}100%{opacity:0;transform:translate(-3px,-30px)}}
.sm2{animation:sm2 6s steps(30) infinite;opacity:0}
@keyframes sm2{0%{opacity:0;transform:translate(0,0)}15%{opacity:.55}100%{opacity:0;transform:translate(3px,-30px)}}
.sm3{animation:sm3 6s steps(30) infinite;opacity:0}
@keyframes sm3{0%{opacity:0;transform:translate(0,0)}15%{opacity:.55}100%{opacity:0;transform:translate(7px,-30px)}}
svg{shape-rendering:crispEdges}
.h0{fill-opacity:.10}.h1{fill-opacity:.12}.h2{fill-opacity:.14}
.rn{animation:rn 4s ease-in-out infinite}
@keyframes rn{0%,100%{opacity:.55}50%{opacity:1}}
.st{animation:st 2.2s steps(2) infinite}
@keyframes st{0%,100%{opacity:1}50%{opacity:.55}}
"""

def render(streak, week, days, inline=False):
    st = STATES[state_of(streak)]
    rnd = random.Random(streak * 31 + 5)
    scene = build_scene(st)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W * S}" height="{H * S}" '
             f'role="img" aria-label="git-campfire: racha de {streak} dias ({st["name"]})">',
             ("" if inline else f"<style>{CSS}</style>"), build_sky_svg(st)]
    # estrellas
    stars = []
    for i in range(st["stars"]):
        x, y = rnd.randint(52, 230), rnd.randint(2, 26)
        if st["name"] != "ASHEN" or i % 2:
            bright = st["name"] == "ETERNAL" and i % 5 == 0
            c = "#fff6d8" if bright else "#9aa3c8"
            dur, dl = 2 + rnd.random() * 3, -rnd.random() * 4
            g = f'<rect x="{x}" y="{y}" width="1" height="1" fill="{c}"/>'
            if bright:
                g += "".join(f'<rect x="{x + dx}" y="{y + dy}" width="1" height="1" fill="#8d8fb8"/>'
                             for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)])
            stars.append(f'<g class="tw" style="animation-duration:{dur:.1f}s;animation-delay:{dl:.1f}s">{g}</g>')
    # luna
    moon = Layer()
    for x in range(196, 203):
        for y in range(6, 13):
            if (x - 199) ** 2 + (y - 9) ** 2 <= 10 and (x - 201) ** 2 + (y - 8) ** 2 > 7:
                moon.put(x, y, "#c9cbe0" if st["name"] != "ASHEN" else "#8b90a6")
    parts += stars + [moon.rects(), scene.rects()]
    # luz parpadeante sobre la escena
    lit = build_light(st, scene)
    if lit:
        parts.append(f'<g class="lt">{lit.rects()}</g>')
    if st["light"]:
        col, R, _ = st["light"]
        rings = []
        for lvl, (rr, op) in enumerate([(R * .55, .10), (R * .35, .12), (R * .2, .14)]):
            L = Layer()
            cy = FB - st["flame"][0] * .45
            for y in range(0, GY):
                for x in range(int(FX - rr * 1.3), int(FX + rr * 1.3) + 1):
                    d = math.hypot((x - FX) / 1.25, y - cy)
                    edge = d / rr
                    if edge <= 1 and not (edge > .9 and (x + y) % 2):
                        L.put(x, y, col)
            rings.append(f'<g class="h{lvl}">{L.rects()}</g>')
        parts.append(f'<g class="lt">{"".join(rings)}</g>')
    rune = build_rune(st)
    if rune:
        parts.append(f'<g class="rn">{rune.rects()}</g>')
    parts.append(f'<g class="cl">{build_coals(st).rects()}</g>')
    # humo
    for i in range(st["smoke"]):
        x = FX - 2 + rnd.randint(-2, 2)
        dx = rnd.randrange(4)
        dur, dl = 5 + rnd.random() * 3, -i * 1.1
        parts.append(f'<g class="sm{dx}" style="animation-duration:{dur:.1f}s;animation-delay:{dl:.1f}s">'
                     f'<rect x="{x}" y="54" width="2" height="2" fill="#5d6170"/>'
                     f'<rect x="{x + 1}" y="53" width="1" height="1" fill="#474a57"/></g>')
    # fuego (4 frames alternando)
    frames = build_flame_frames(st)
    for i, fr in enumerate(frames):
        parts.append(f'<g class="fl" style="animation-delay:-{i * .13:.2f}s">{fr.rects()}</g>')
    # chispas
    Hf = st["flame"][0] if st["flame"] else 4
    for i in range(st["embers"]):
        x = FX + rnd.randint(-int(Hf / 3) - 1, int(Hf / 3) + 1)
        y = FB - rnd.randint(int(Hf * .5), Hf)
        dx = rnd.randrange(5)
        c = rnd.choice(["#ffb347", "#ff8a2a", "#ffd27a"] + (["#bfe6ff"] if st["name"] == "ETERNAL" else []))
        dur, dl = 2.2 + rnd.random() * 2.2, -rnd.random() * 4
        parts.append(f'<rect class="em{dx}" style="animation-duration:{dur:.1f}s;animation-delay:{dl:.1f}s" '
                     f'x="{x}" y="{y}" width="1" height="1" fill="{c}"/>')
    # HUD
    hud, (sx, sy) = build_hud(st, streak, week, days)
    parts.append(hud.rects())
    status = Layer()
    text(status, st["name"], sx, sy, st["label_col"])
    parts.append(f'<g class="st">{status.rects()}</g>' if st["name"] == "ETERNAL" else status.rects())
    parts.append("</svg>")
    return "".join(parts)

if __name__ == "__main__":
    streak, week, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    days = [c == "1" for c in (sys.argv[4] if len(sys.argv) > 4 else "1111111")]
    svg = render(streak, week, days)
    with open(out, "w") as fh:
        fh.write(svg)
    print(out, len(svg) // 1024, "KB")
