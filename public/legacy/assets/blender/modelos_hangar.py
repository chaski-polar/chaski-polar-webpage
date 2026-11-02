"""Modela en low-poly el barco de investigación y el iceberg, y los renderiza en cuadros
pequeños (para pixelar luego con la paleta del juego).

Uso (sin abrir la ventana de Blender):
  "D:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" --background --factory-startup ^
      --python modelos_hangar.py -- <carpeta_salida>
Genera <salida>/barco_00.png ... barco_11.png, iceberg_00.png ... y guarda hangar.blend.
"""
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector

SALIDA = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.dirname(os.path.abspath(__file__))
os.makedirs(SALIDA, exist_ok=True)
CUADROS = 12
W, H = 160, 112

PAL = {
    "mar": "#1b5a8c", "marClaro": "#2a86b8", "celeste": "#63cde8", "hielo": "#eaf6fa", "hieloSombra": "#a9d3e6",
    "blanco": "#ffffff", "fito": "#3fc28c", "fitoClaro": "#9be86a", "rojo": "#e0474c", "ninoOscuro": "#c4502a",
    "nino": "#f08a4b", "sol": "#f2d14c", "gris": "#6f8ea3", "abismo": "#050f1f", "hondo": "#0d2747", "plata": "#c8dbe6",
    "niebla": "#a3bccb", "pezOscuro": "#4f7396", "roca": "#5a4a46", "noche": "#0a1a33", "marMedio": "#1b5a8c",
    "fitoOscuro": "#1e7a5a",
}
# rampa de cada material: (cara de arriba, cara hacia la luz, cara en sombra). Luz desde arriba a la izquierda.
RAMPA = {
    "blanco": ("blanco", "hielo", "hieloSombra"), "hielo": ("blanco", "hielo", "hieloSombra"),
    "hieloSombra": ("hielo", "hieloSombra", "niebla"), "plata": ("plata", "niebla", "gris"),
    "gris": ("niebla", "gris", "pezOscuro"), "rojo": ("nino", "rojo", "ninoOscuro"),
    "nino": ("sol", "nino", "ninoOscuro"), "sol": ("sol", "sol", "nino"), "hondo": ("marMedio", "hondo", "noche"),
    "abismo": ("hondo", "abismo", "abismo"), "mar": ("marMedio", "mar", "hondo"),
    "celeste": ("celeste", "marClaro", "marMedio"), "fito": ("fito", "fito", "fitoOscuro"),
    "fitoClaro": ("fitoClaro", "fito", "fitoOscuro"),
}


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


MATS = {}


def ramp(o, base):
    o.data.materials.clear()
    for n in RAMPA.get(base, (base, base, base)):
        o.data.materials.append(mat(n))
    o["base"] = base


def sombrear():
    """Asigna a cada cara el tono de su rampa según su normal en el mundo (se llama en cada cuadro)."""
    bpy.context.view_layer.update()
    for o in bpy.data.objects:
        if o.type != "MESH" or "base" not in o:
            continue
        m3 = o.matrix_world.to_3x3()
        for p in o.data.polygons:
            n = (m3 @ p.normal).normalized()
            if n.z > 0.6:
                p.material_index = 0
            elif -n.x * 0.75 - n.y * 0.45 > -0.15:
                p.material_index = 1
            else:
                p.material_index = 2


def mat(nombre):
    if nombre not in MATS:
        h = PAL[nombre]
        m = bpy.data.materials.new(nombre)
        m.diffuse_color = (lin(int(h[1:3], 16)), lin(int(h[3:5], 16)), lin(int(h[5:7], 16)), 1)
        MATS[nombre] = m
    return MATS[nombre]


def limpiar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def caja(nombre, pos, esc, color, padre):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.active_object
    o.name = nombre
    o.scale = esc
    ramp(o, color)
    o.parent = padre
    return o


def cilindro(nombre, pos, r, alto, color, padre, verts=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=alto, location=pos, rotation=rot)
    o = bpy.context.active_object
    o.name = nombre
    ramp(o, color)
    o.parent = padre
    return o


def casco(padre):
    """Casco con proa en punta: caja de 8 vértices a la que se le estrecha la proa."""
    me = bpy.data.meshes.new("casco")
    bm = bmesh.new()
    # x a lo largo (proa en +x), y ancho, z alto
    perfil = [(-2.4, 0.8), (1.6, 0.8), (2.7, 0.0)]  # (x, medio ancho)
    capas = [(-0.5, 0.82), (0.0, 1.0), (0.45, 1.05)]  # (z, factor de ancho)
    filas = []
    for z, f in capas:
        fila = []
        for x, a in perfil:
            fila.append(bm.verts.new((x + (0.25 if z > 0.3 and x > 2 else 0), a * f, z)))
        for x, a in reversed(perfil[:-1]):
            fila.append(bm.verts.new((x, -a * f, z)))
        filas.append(fila)
    n = len(filas[0])
    for k in range(len(filas) - 1):
        for i in range(n):
            bm.faces.new((filas[k][i], filas[k][(i + 1) % n], filas[k + 1][(i + 1) % n], filas[k + 1][i]))
    bm.faces.new(list(reversed(filas[0])))
    bm.faces.new(filas[-1])
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new("casco", me)
    bpy.context.collection.objects.link(o)
    ramp(o, "rojo")
    o.parent = padre
    o.location = (0, 0, 0.35)
    return o


def mar(padre, radio, sem, fitos=14):
    cilindro("mar", (0, 0, -0.05), radio, 0.2, "mar", padre, verts=24)
    cilindro("mar_borde", (0, 0, -0.3), radio * 0.98, 0.4, "hondo", padre, verts=24)
    random.seed(sem)
    for i in range(fitos):
        a, r = random.random() * 6.283, radio * (0.55 + random.random() * 0.4)
        cilindro(f"fito{i}", (math.cos(a) * r, math.sin(a) * r, 0.06), 0.18 + random.random() * 0.22, 0.04,
                 "fitoClaro" if i % 3 == 0 else "fito", padre, verts=6)
    for i in range(10):
        a, r = random.random() * 6.283, radio * (0.3 + random.random() * 0.6)
        caja(f"ola{i}", (math.cos(a) * r, math.sin(a) * r, 0.06), (0.5, 0.08, 0.03), "celeste", padre).rotation_euler.z = a


def barco():
    raiz = bpy.data.objects.new("raiz_barco", None)
    bpy.context.collection.objects.link(raiz)
    nave = bpy.data.objects.new("nave", None)
    bpy.context.collection.objects.link(nave)
    nave.parent = raiz
    casco(nave)
    caja("cubierta_popa", (-1.2, 0, 0.92), (2.0, 1.5, 0.12), "plata", nave)
    caja("puente1", (0.6, 0, 1.2), (1.8, 1.4, 0.6), "blanco", nave)
    caja("puente2", (0.8, 0, 1.7), (1.2, 1.2, 0.45), "blanco", nave)
    caja("ventanas", (1.41, 0, 1.75), (0.03, 1.0, 0.16), "hondo", nave)
    caja("techo", (0.8, 0, 1.97), (1.3, 1.3, 0.08), "gris", nave)
    cilindro("mastil", (0.5, 0, 2.55), 0.06, 1.2, "gris", nave)
    caja("radar", (0.5, 0, 2.95), (0.08, 0.7, 0.06), "sol", nave)
    cilindro("chimenea", (-0.25, 0, 1.8), 0.22, 0.7, "nino", nave)
    caja("chimenea_top", (-0.25, 0, 2.17), (0.46, 0.46, 0.08), "abismo", nave)
    # pórtico en A de popa (para bajar instrumentos)
    caja("portico_izq", (-2.15, 0.55, 1.4), (0.12, 0.12, 1.0), "nino", nave)
    caja("portico_der", (-2.15, -0.55, 1.4), (0.12, 0.12, 1.0), "nino", nave)
    caja("portico_top", (-2.15, 0, 1.9), (0.14, 1.25, 0.12), "nino", nave)
    caja("roseta", (-1.6, 0, 1.15), (0.35, 0.35, 0.35), "sol", nave)
    mar(raiz, 4.6, 4)
    return raiz, nave


def iceberg():
    raiz = bpy.data.objects.new("raiz_iceberg", None)
    bpy.context.collection.objects.link(raiz)
    hielo = bpy.data.objects.new("hielo", None)
    bpy.context.collection.objects.link(hielo)
    hielo.parent = raiz
    random.seed(11)
    for i, (pos, esc, col) in enumerate([
        ((-0.4, -0.2, 0.7), (1.6, 1.3, 1.3), "hielo"),
        ((0.9, 0.5, 0.6), (1.1, 1.0, 1.1), "blanco"),
        ((-0.2, 0.6, 0.3), (1.9, 1.2, 0.7), "hieloSombra"),
    ]):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=pos)
        o = bpy.context.active_object
        o.name = f"bloque{i}"
        o.scale = esc
        for v in o.data.vertices:
            v.co += Vector((random.uniform(-.18, .18), random.uniform(-.18, .18), random.uniform(-.12, .2)))
            if v.co.z < -0.3:
                v.co.z = -0.3
        ramp(o, col)
        o.parent = hielo
    cilindro("hielo_bajo", (0, 0.1, -0.02), 2.7, 0.12, "celeste", hielo, verts=7)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=1.5, radius2=0.25, depth=3.4, location=(-0.6, -0.1, 1.6))
    pico = bpy.context.active_object
    pico.name = "pinaculo"
    pico.rotation_euler.z = 0.4
    ramp(pico, "hielo")
    pico.parent = hielo
    for k, (x, y) in enumerate([(1.4, -0.8), (1.7, -0.5)]):
        cilindro(f"ping{k}", (x, y, 1.05), 0.1, 0.32, "abismo", hielo, verts=6)
        caja(f"pingb{k}", (x + 0.08, y, 1.0), (0.06, 0.12, 0.18), "blanco", hielo)
    mar(raiz, 4.6, 9, fitos=18)
    return raiz, hielo


def camara_y_render():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "FLAT"
    sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.show_shadows = False
    sc.display.shading.show_cavity = False
    sc.display.shading.show_object_outline = False
    sc.display.render_aa = "OFF"
    sc.render.film_transparent = True
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    cam_d = bpy.data.cameras.new("cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = 9.8
    cam = bpy.data.objects.new("cam", cam_d)
    bpy.context.collection.objects.link(cam)
    elev = math.radians(34)
    cam.location = (0, -20 * math.cos(elev), 20 * math.sin(elev) + 0.6)
    cam.rotation_euler = (math.pi / 2 - elev, 0, 0)
    sc.camera = cam


def render(nombre, raiz, movil, ang0, balanceo):
    sc = bpy.context.scene
    for f in range(CUADROS):
        t = f / CUADROS
        raiz.rotation_euler.z = ang0 + t * 2 * math.pi
        movil.location.z = math.sin(t * 2 * math.pi * 2) * balanceo
        movil.rotation_euler.x = math.sin(t * 2 * math.pi * 2 + 1) * 0.04
        sombrear()
        sc.render.filepath = os.path.join(SALIDA, f"{nombre}_{f:02d}.png")
        bpy.ops.render.render(write_still=True)


limpiar()
camara_y_render()
rb, nave = barco()
render("barco", rb, nave, 0.6, 0.06)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, "hangar-barco.blend"))
for o in list(bpy.data.objects):
    if o.type != "CAMERA":
        bpy.data.objects.remove(o)
ri, hielo = iceberg()
render("iceberg", ri, hielo, 0.3, 0.05)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SALIDA, "hangar-iceberg.blend"))
print("LISTO", SALIDA)
