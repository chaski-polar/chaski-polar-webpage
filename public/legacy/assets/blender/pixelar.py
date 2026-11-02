"""Pasa los renders de Blender (render/*.png) a la paleta exacta del juego, les pone contorno
oscuro de 1 px y arma un spritesheet horizontal por modelo en assets/.

Uso:  python pixelar.py      (después de modelos_hangar.py)
"""
import glob
import os

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
PAL = ["#050f1f", "#0a1a33", "#0d2747", "#123a66", "#1b5a8c", "#2a86b8", "#63cde8", "#eaf6fa", "#a9d3e6", "#ffffff",
       "#3fc28c", "#9be86a", "#1e7a5a", "#f08a4b", "#c4502a", "#f2d14c", "#d9b26f", "#9c7444", "#5a4a46", "#6f8ea3",
       "#a3bccb", "#e0474c", "#c8dbe6", "#4f7396"]
RGB = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in PAL]
CONTORNO = RGB[0]


def cercano(c):
    return min(RGB, key=lambda q: (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2)


def pixelar(ruta):
    im = Image.open(ruta).convert("RGBA")
    w, h = im.size
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            px[x, y] = (*cercano((r, g, b)), 255) if a >= 128 else (0, 0, 0, 0)
    # contorno: píxel transparente con un vecino opaco (sin diagonales)
    borde = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] == 0 and any(
        0 <= x + dx < w and 0 <= y + dy < h and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))]
    for x, y in borde:
        px[x, y] = (*CONTORNO, 255)
    return im


for nombre in ("barco", "iceberg"):
    cuadros = sorted(glob.glob(os.path.join(AQUI, "render", f"{nombre}_*.png")))
    imgs = [pixelar(c) for c in cuadros]
    w, h = imgs[0].size
    hoja = Image.new("RGBA", (w * len(imgs), h), (0, 0, 0, 0))
    for i, im in enumerate(imgs):
        hoja.paste(im, (i * w, 0))
    salida = os.path.join(AQUI, "..", f"hangar-{nombre}.png")
    hoja.save(salida, optimize=True)
    print(os.path.normpath(salida), hoja.size, len(hoja.getcolors(4096)), "colores")
