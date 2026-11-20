"""Regenera todo el arte de referencia en ../assets desde el prototipo (solo librería estándar de Python 3)."""
import os
import render
import options
import options3

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, "..", "assets")


def save(rel, svg):
    path = os.path.join(ART, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(svg)
    print(f"{rel:38s} {len(svg) // 1024:4d} KB")


# Tema ruins (Opción A) — los 4 estados
for name, streak, week, days in [("ashen", 0, 0, "0000000"), ("kindled", 2, 5, "0000111"),
                                 ("blazing", 9, 23, "1111111"), ("eternal", 23, 41, "1111111")]:
    save(f"ruins/{name}.svg", render.render(streak, week, [c == "1" for c in days]))
# Tema void (Opción D)
save("void/ashen.svg", options.scene_void(False))
save("void/eternal.svg", options.scene_void(True))
# Tema cathedral (Opción F v2)
for lv, name in [(0, "ashen"), (2, "blazing"), (3, "eternal")]:
    save(f"cathedral/{name}.svg", options3.scene_nave2(lv))
# Exploración descartable (Opción B)
save("explorations/trail/ashen.svg", options.scene_trail(False))
save("explorations/trail/eternal.svg", options.scene_trail(True))
