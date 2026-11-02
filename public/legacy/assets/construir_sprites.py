"""Convierte los PNG de assets/ (exportados desde Aseprite) en ../juego-sprites.js.

Así el juego funciona con doble clic (file:), sin cargar imágenes por canvas (CORS).
Cada sprite queda como filas de caracteres + mapa a los nombres de la paleta del juego,
el mismo formato que usa sprite() en juego-pixel.js. Si un PNG usa un color fuera de la
paleta, el script avisa y se detiene.

Uso:  cd D:\\hackathon\\NASA\\explorador\\assets  &&  python construir_sprites.py
"""
import base64
import json
import os
import sys

from PIL import Image

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "..", "juego-sprites.js")

PAL = {
    "abismo": "#050f1f", "noche": "#0a1a33", "hondo": "#0d2747", "mar": "#123a66",
    "marMedio": "#1b5a8c", "marClaro": "#2a86b8", "celeste": "#63cde8", "hielo": "#eaf6fa",
    "hieloSombra": "#a9d3e6", "blanco": "#ffffff", "fito": "#3fc28c", "fitoClaro": "#9be86a",
    "fitoOscuro": "#1e7a5a", "nino": "#f08a4b", "ninoOscuro": "#c4502a", "sol": "#f2d14c",
    "arena": "#d9b26f", "arenaOscura": "#9c7444", "roca": "#5a4a46", "gris": "#6f8ea3",
    "niebla": "#a3bccb", "rojo": "#e0474c", "plata": "#c8dbe6", "pezOscuro": "#4f7396",
}
POR_RGB = {tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)): k for k, v in PAL.items()}
LETRAS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# nombre -> (archivo, ancho de cuadro o None si es un solo cuadro, nombres de los cuadros)
SPRITES = {
    "anchoveta": ("anchoveta.png", None, None),
    "cardumen": ("cardumen.png", None, None),
    "concha": ("concha.png", None, None),
    "kril": ("kril.png", None, None),
    "pinguino": ("pinguino.png", None, None),
    "satelite": ("satelite.png", None, None),
    "bolichera": ("bolichera.png", None, None),
    "buque": ("buque.png", None, None),
    "base": ("base.png", None, None),
    "iconos": ("iconos.png", 13, ["hielo", "sam", "fito", "temp", "nino"]),
    "flechas": ("flechas.png", 7, ["sube", "baja", "igual"]),
}
# imágenes grandes (renders de Blender ya pixelados): van como data URI PNG
IMAGENES = {
    "hangarBarco": "hangar-barco.png",
    "hangarIceberg": "hangar-iceberg.png",
}


def a_filas(img, x0, w):
    h = img.height
    mapa, filas = {}, []
    inv = {}
    for y in range(h):
        fila = ""
        for x in range(x0, x0 + w):
            r, g, b, a = img.getpixel((x, y))
            if a < 128:
                fila += "."
                continue
            nom = POR_RGB.get((r, g, b))
            if nom is None:
                sys.exit(f"Color fuera de la paleta #{r:02x}{g:02x}{b:02x} en ({x},{y})")
            if nom not in inv:
                ch = LETRAS[len(inv)]
                inv[nom] = ch
                mapa[ch] = nom
            fila += inv[nom]
        filas.append(fila)
    return {"filas": filas, "mapa": mapa}


def main():
    datos = {}
    for nombre, (archivo, ancho, cuadros) in SPRITES.items():
        img = Image.open(os.path.join(AQUI, archivo)).convert("RGBA")
        if ancho is None:
            datos[nombre] = a_filas(img, 0, img.width)
        else:
            datos[nombre] = {c: a_filas(img, i * ancho, ancho) for i, c in enumerate(cuadros)}
    imagenes = {}
    for nombre, archivo in IMAGENES.items():
        ruta = os.path.join(AQUI, archivo)
        if os.path.exists(ruta):
            with open(ruta, "rb") as f:
                imagenes[nombre] = "data:image/png;base64," + base64.b64encode(f.read()).decode()
    js = ("/* Generado por assets/construir_sprites.py desde los PNG de Aseprite/Blender. No editar a mano. */\n"
          "window.PIX_ASSETS = " + json.dumps(datos, ensure_ascii=False, separators=(",", ":")) + ";\n"
          "window.PIX_IMAGENES = " + json.dumps(imagenes, separators=(",", ":")) + ";\n")
    with open(SALIDA, "w", encoding="utf-8") as f:
        f.write(js)
    print(f"Escrito {os.path.normpath(SALIDA)}: {len(datos)} sprites, {len(imagenes)} imágenes, {len(js) // 1024} KB")


if __name__ == "__main__":
    main()
