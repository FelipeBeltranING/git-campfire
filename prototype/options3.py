"""git-campfire — Opción F v2: Nave de la catedral (rehecha).

Cambios frente a v1: paleta fría azul-violeta contra el oro del fuego, profundidad real (arcada con
pilares en perspectiva, naves laterales oscuras, suelo con fuga), pilares cilíndricos sombreados,
rosetón con lóbulos y vitrales, luz de luna que proyecta el color de los vitrales en el suelo,
hiedra, estandartes, candelabro roto, viñeta.
"""
import math
import random

from options import P, CSS as OPT_CSS, PAL_EPIC, PAL_WARM, SIT, SPAL, embers, flame_frames, halo, hud, lit, sprite, wrap
from render import mix, noise

W, H = 240, 80
CSS = OPT_CSS + """
.mt{animation:mt 9s steps(40) infinite;opacity:0}
@keyframes mt{0%{opacity:0;transform:translate(0,0)}20%{opacity:.85}100%{opacity:0;transform:translate(7px,12px)}}
.vg{fill-opacity:.42}.sh{fill-opacity:.16}.sh2{fill-opacity:.26}.pt{fill-opacity:.38}
"""

VP = (120, 30)            # punto de fuga
FLOOR = 59
GLASS = ["#2a4ad0", "#b02a3a", "#e0a83a", "#2a9a8a", "#7a3ac0", "#d0603a"]


def scene_nave2(level, inline=False):
    """level: 0 = ashen, 2 = blazing, 3 = eternal."""
    rnd = random.Random(5)
    epic, ashen = level == 3, level == 0
    streak, week = {0: (0, 0), 2: (9, 23), 3: (23, 41)}[level]
    days = {0: [1, 0, 1, 0, 0, 0, 0], 2: [1, 0, 1, 1, 1, 1, 1], 3: [1] * 7}[level]
    cold = 1.0 if ashen else .6 if level == 2 else .35        # cuánto domina la luna
    scene, depth, parts = P(), {}, []

    # ---------------- muro: degradado vertical + sillares irregulares
    for y in range(0, FLOOR):
        base = mix("#0b0a17", "#1b1932", min(1, y / 55))
        for x in range(W):
            course = y // 5
            joint = y % 5 == 0 or (x + course * 7 + (course % 3) * 3) % 11 == 0
            c = mix(base, "#0a0914", .45) if joint else base
            if not joint and noise(x, y, 21) > .9:
                c = mix(base, "#2a2846", .25)
            scene.put(x, y, c); depth[(x, y)] = "bg"

    # ---------------- pilares (cerca → lejos) y arcos ojivales entre ellos
    pillars = [(8, 21, 80, 18), (43, 51, 71, 24), (68, 73, 62, 29),      # izquierda: x0, x1, base, arranque arco
               (167, 172, 62, 29), (189, 197, 71, 24), (219, 232, 80, 18)]

    def arch(xa, xb, ys, k, inner):
        xc, half = (xa + xb) / 2, (xb - xa) / 2
        for x in range(xa, xb + 1):
            t = abs(x - xc) / half
            top = int(ys - k * (1 - t) ** .45)
            for y in range(top, FLOOR + 14):
                if (x, y) in depth and depth[(x, y)] != "bg":
                    continue
                c = inner if y >= top + 2 else "#2a2742"
                if y >= top + 2 and y < top + 4:
                    c = "#0e0d1b"
                scene.put(x, y, c); depth[(x, y)] = "bg"

    dark = "#08070f"
    arch(22, 42, 24, 16, dark); arch(52, 67, 29, 11, dark)
    arch(198, 218, 24, 16, dark); arch(173, 188, 29, 11, dark)
    # ventanas lanceta en las naves laterales
    lancet = P()
    for (cx, y0, y1) in [(32, 30, 46), (59, 34, 46), (208, 30, 46), (181, 34, 46)]:
        for y in range(y0, y1):
            for x in range(cx - 1, cx + 2):
                if y > y0 + 1 or x == cx:
                    if not epic or (x + y) % 2 == 0:
                        lancet.put(x, y, "#5a78c8" if not epic else "#c8903a")
    # ábside (muro del fondo, un poco más claro)
    for x in range(74, 167):
        for y in range(0, FLOOR):
            c = scene[(x, y)]
            scene[(x, y)] = mix(c, "#262444", .18)

    for (x0, x1, base, ys) in pillars:
        w = x1 - x0
        for x in range(x0, x1 + 1):
            t = (x - x0) / max(1, w)
            c = "#34325a" if t < .2 else "#262444" if t < .55 else "#1b1a31" if t < .85 else "#121124"
            for y in range(0, base):
                cc = c
                if y in (ys, ys + 1):
                    cc = mix(c, "#3e3c66", .5)
                if (y + x0) % 9 == 0:
                    cc = mix(cc, "#0e0d1b", .35)
                scene.put(x, y, cc); depth[(x, y)] = "prop"
        for x in range(x0 - 2, x1 + 3):                      # capitel y basa
            for y in (ys - 1, base - 2, base - 1):
                scene.put(x, y, "#3a3862" if y == ys - 1 or y == base - 2 else "#24223e")
                depth[(x, y)] = "prop"

    # ---------------- suelo en perspectiva
    rows = [FLOOR, 60, 62, 65, 69, 74, 81]
    for r in range(len(rows) - 1):
        for y in range(rows[r], min(H, rows[r + 1])):
            for x in range(W):
                xb = VP[0] + (x - VP[0]) * (80 - VP[1]) / (y - VP[1])
                col = math.floor((xb + 48) / 18)
                xb2 = VP[0] + (x + 1 - VP[0]) * (80 - VP[1]) / (y - VP[1])
                line = y == rows[r] or math.floor((xb2 + 48) / 18) != col
                c = "#100f1d" if line else ("#1a1830" if (col + r) % 2 else "#151427")
                if not line and noise(x, y, 31) > .95:
                    c = "#1f1d38"
                scene.put(x, y, c); depth[(x, y)] = "ground"

    # ---------------- altar escalonado + paño carmesí
    for (y0, y1, xa, xb, cc) in [(56, 59, 92, 148, "#24223e"), (53, 56, 98, 142, "#2a2848"), (45, 53, 109, 131, "#2e2c4e")]:
        for y in range(y0, y1):
            for x in range(xa, xb):
                c = "#3a3862" if y == y0 else cc
                scene.put(x, y, c); depth[(x, y)] = "prop"
    for y in range(46, 55):
        for x in range(116, 125):
            scene.put(x, y, "#6a1a24" if y < 54 else "#4a1018"); depth[(x, y)] = "prop"
        scene.put(120, y, "#c89a4a" if epic else "#7a5a34")

    # ---------------- rosetón
    RX, RY, RR = 120, 20, 14
    win, glass = P(), P()
    for x in range(RX - RR - 3, RX + RR + 4):
        for y in range(max(0, RY - RR - 3), RY + RR + 4):
            d = math.hypot(x - RX, y - RY)
            ang = (math.degrees(math.atan2(y - RY, x - RX)) + 360) % 360
            seg = int(ang // 30)
            if d <= RR:
                # lóbulos exteriores: 12 círculos pequeños
                la = math.radians(seg * 30 + 15)
                lx, ly = RX + 10.5 * math.cos(la), RY + 10.5 * math.sin(la)
                in_lobe = math.hypot(x - lx, y - ly) <= 2.6
                spoke = (min(ang % 30, 30 - ang % 30) * math.pi / 180 * d < .7) and 2.5 < d < 8
                ring = abs(d - 7.5) < .7 or (d > 8.2 and not in_lobe)
                hub = d < 2.5
                if hub or spoke or ring:
                    scene[(x, y)] = "#3a3862" if not hub else "#4a4876"; depth[(x, y)] = "prop"
                else:
                    scene.pop((x, y), None)
                    win.put(x, y, mix("#0a0d22", "#1d2a52", (y - RY + RR) / (2 * RR)))
                    gi = (seg + (2 if in_lobe else 0)) % len(GLASS)
                    broken = ashen and (seg * 7 + in_lobe * 3) % 4 == 0
                    if not broken:
                        g = GLASS[gi]
                        g = mix(g, "#0c0b18", .72 if ashen else .4 if level == 2 else 0)
                        glass.put(x, y, g)
            elif d <= RR + 2.6:
                scene[(x, y)] = "#3e3c68" if d <= RR + 1.2 else "#2a2848"
                depth[(x, y)] = "prop"
    # ---------------- hiedra en pilares cercanos y arcos
    ivy = ["#16301f", "#1f4a2c", "#2a5e38"]
    for (sx, sy, n) in [(20, 16, 30), (9, 40, 22), (219, 20, 26), (231, 44, 18), (42, 22, 14), (196, 22, 14), (28, 10, 10)]:
        x, y = sx, sy
        for i in range(n):
            scene.put(x, y, ivy[(i * 7) % 3]); depth[(x, y)] = "prop"
            if i % 3 == 0:
                scene.put(x + rnd.choice([-1, 1]), y, ivy[2]); depth[(x, y)] = "prop"
            y += 1
            x += rnd.choice([-1, 0, 0, 1])
    # musgo al pie de los pilares
    for x in list(range(4, 26)) + list(range(214, 236)):
        if noise(x, 3, 40) > .55:
            scene.put(x, 79 - int(noise(x, 4) * 2), ivy[1]); depth[(x, 79)] = "ground"

    # ---------------- estandartes raídos
    for (bx, flip) in [(53, False), (181, True)]:
        for x in range(bx, bx + 7):
            ln = 18 - ((x * 5) % 4)
            for y in range(30, 30 + ln):
                c = "#6a1a24" if (x - bx) not in (0, 6) else "#4a1018"
                scene.put(x, y, c); depth[(x, y)] = "prop"
        for (ex, ey) in [(3, 34), (3, 35), (2, 36), (3, 36), (4, 36), (2, 37), (3, 37), (4, 37), (3, 38)]:
            scene.put(bx + ex, ey, "#d8a24a" if epic else "#8a6a3a")
        for x in range(bx - 1, bx + 8):
            scene.put(x, 29, "#5a4630")

    # ---------------- candelabro roto colgando
    for y in range(0, 11):
        scene.put(86, y, "#2a2846" if y % 2 else "#3a3862"); depth[(86, y)] = "prop"
    for x in range(81, 92):
        yy = 11 + (x - 81) // 4
        scene.put(x, yy, "#4a4060"); depth[(x, yy)] = "prop"
    for x in (81, 85, 89):
        scene.put(x, 10 + (x - 81) // 4, "#7a7466"); depth[(x, 10 + (x - 81) // 4)] = "prop"

    # ---------------- escombros
    for x in range(197, 214):
        for y in range(72, 77):
            if (x - 205) ** 2 / 70 + (y - 74.5) ** 2 / 6 <= 1:
                scene.put(x, y, "#34325a" if y == 72 else "#22203a" if x < 209 else "#1a1830"); depth[(x, y)] = "prop"
    for (x, y) in [(190, 75), (215, 77), (186, 77), (60, 73), (64, 74)]:
        scene.put(x, y, "#2a2848"); scene.put(x + 1, y, "#1e1c34")

    # ---------------- troncos + viajero
    FX, FB = 110, 68
    for i in range(12):
        for (xx, yy, c) in [(104 + i, 70 - i // 5, "#3b2717"), (116 - i, 70 - i // 5, "#4a311c")]:
            scene.put(xx, yy, c); depth[(xx, yy)] = "prop"
    for (sx, w) in [(101, 3), (117, 3), (106, 2), (113, 2)]:
        for i in range(w):
            scene.put(sx + i, 71, "#3a3862"); depth[(sx + i, 71)] = "prop"
    sp = P()
    eye = "#ffcf7a" if not ashen else None
    sprite(sp, SIT, 85, 71 - len(SIT), eye=eye)
    for k, c in sp.items():
        scene[k] = c; depth[k] = "prop"

    parts.append(win.svg())
    parts.append(scene.svg())
    if epic:
        parts.append(halo(RX, RY, 40, "#e0a83a", sx=1.0))
    parts.append(f'<g class="{"wf" if epic else ""}">{glass.svg()}</g>')
    parts.append(f'<g class="wf">{lancet.svg()}</g>' if not ashen else f'<g class="pt">{lancet.svg()}</g>')

    # ---------------- velas = últimos 7 días
    cand = [(100, 55), (105, 55), (110, 52), (120, 44), (130, 52), (135, 55), (140, 55)]
    srcs = []
    for (x, y), on in zip(cand, days):
        hgt = 3 if x != 120 else 4
        parts.append(f'<rect x="{x}" y="{y - hgt}" width="1" height="{hgt}" fill="{"#e8dfc0" if on else "#6a6458"}"/>'
                     f'<rect x="{x + 1}" y="{y - 1}" width="1" height="1" fill="{"#c8bf9c" if on else "#5a5448"}"/>')
        if on:
            parts.append(f'<g class="fa"><rect x="{x}" y="{y - hgt - 2}" width="1" height="2" fill="#ffd27a"/></g>'
                         f'<g class="fb"><rect x="{x}" y="{y - hgt - 1}" width="1" height="1" fill="#ffb347"/>'
                         f'<rect x="{x}" y="{y - hgt - 2}" width="1" height="1" fill="#ff8a2a"/></g>')
            srcs.append((x, y - hgt, 9, .5, "#ffb347"))

    # ---------------- fuego
    if level >= 2:
        R = 62 if epic else 44
        srcs.append((FX, FB - 4, R, .5, "#ffb950" if epic else "#ff9a45"))
        parts.append(lit(scene, depth, srcs))
        parts.append(halo(FX, FB - 10, R * .6, "#ffb950" if epic else "#ff9a45"))
        Hf, Wm = (26, 8) if epic else (17, 6)
        parts.append(flame_frames(FX, FB, Hf, Wm, PAL_EPIC if epic else PAL_WARM, seed=8))
        parts.append(embers(rnd, FX, FB, Hf, 24 if epic else 10, ["#ffb347", "#ffd27a"] + (["#bfe6ff"] if epic else [])))
    else:
        parts.append(lit(scene, depth, srcs))
        parts.append(f'<g class="cl"><rect x="107" y="67" width="2" height="1" fill="#8a2a1a"/>'
                     f'<rect x="112" y="66" width="1" height="1" fill="#8a2a1a"/></g>')
        for i in range(5):
            parts.append(f'<g class="sm{i % 4}" style="animation-duration:6s;animation-delay:{-i * 1.2:.1f}s">'
                         f'<rect x="{109 + i % 2}" y="63" width="2" height="2" fill="#5d6170"/></g>')

    # ---------------- haces de luna y mancha de color en el suelo
    shafts, patch = P(), P()
    for y in range(RY + 6, 76):
        f = (y - (RY + 6)) / (76 - RY - 6)
        xa = 112 + f * 14
        xb = 128 + f * 34
        for x in range(int(xa), int(xb)):
            if y < 62:
                if (x + y) % 2 == 0:
                    shafts.put(x, y, "#a8c0ff")
            else:
                if epic:
                    u = (x - xa) / max(1, xb - xa)
                    patch.put(x, y, GLASS[int(u * 6) % len(GLASS)])
                else:
                    patch.put(x, y, "#9fb4f0")
    parts.append(f'<g class="sh">{shafts.svg()}</g>')
    parts.append(f'<g class="{"sh2" if not epic else "pt"}"><g class="{"wf" if epic else ""}">{patch.svg()}</g></g>')
    for i in range(14):
        x, y = 116 + rnd.randint(0, 26), RY + 10 + rnd.randint(0, 34)
        parts.append(f'<rect class="mt" style="animation-delay:{-rnd.random() * 9:.1f}s" x="{x}" y="{y}" '
                     f'width="1" height="1" fill="#dfe8ff"/>')

    # ---------------- viñeta
    vg = P()
    for x in range(W):
        for y in range(H):
            e = max(abs(x - 120) / 120, 0) ** 2 * .7 + (abs(y - 44) / 44) ** 2 * .6
            if e > .55 and ((x + y) % 2 == 0 or e > .75):
                vg.put(x, y, "#000000")
    parts.append(f'<g class="vg">{vg.svg()}</g>')

    status = {0: "ASHEN", 2: "BLAZING", 3: "ETERNAL"}[level]
    scol = {0: "#8a8fb0", 2: "#ff9a3c", 3: "#ffd27a"}[level]
    parts.append(hud(streak, week, days, status, scol, frame="#3a3862", bg="#0a0916", lab="#7a76a8", blink=epic))
    return wrap(parts, f"Nave de la catedral, racha {streak}", inline).replace("<style>" + OPT_CSS, "<style>" + CSS)


if __name__ == "__main__":
    for lv, name in [(0, "ashen"), (2, "blazing"), (3, "eternal")]:
        s = scene_nave2(lv)
        open(f"out/F2_{name}.svg", "w").write(s)
        print(name, len(s) // 1024, "KB")
