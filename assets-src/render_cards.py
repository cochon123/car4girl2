"""Render transparent "cutout" card art for the lesson cards from the exported GLBs.

    blender -b -P assets-src/render_cards.py            # all cards
    blender -b -P assets-src/render_cards.py -- tires    # one card

Writes public/img/lesson-<slug>.webp (the dashboard card is a screenshot of the
dashboard lesson's cluster, see README).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.path.join(ROOT, "public", "models")
OUT = os.path.join(ROOT, "public", "img")

# slug: (model file, view direction in Blender coords (Z up, car front = -Y), zoom, look offset)
CARDS = {
    "engine": ("engine-cutaway.glb", (1.0, -0.55, 0.35), 1.05, (0, 0, 0)),
    "under-the-hood": ("engine-bay.glb", (0.25, -1.0, 0.95), 1.0, (0, 0, 0)),
    "tires": ("wheel-brake.glb", (1.0, -0.6, 0.25), 1.0, (0, 0, 0)),
    "brakes": ("wheel-brake.glb", (1.0, 0.75, 0.45), 0.95, (0, 0, 0)),
    "flat-tire": ("car.glb", (1.0, -1.15, 0.42), 1.0, (0, 0, -0.1)),
}

CANDY = (1.0, 0.24, 0.6, 1.0)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def setup_render(scene, w=1000, h=760):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices:
                        d.use = True
                    scene.cycles.device = "GPU"
                    break
            except TypeError:
                continue
    except Exception as e:  # CPU fallback is fine, just slower
        print("GPU setup failed, using CPU:", e)
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"

    world = bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.05, 0.035, 0.07, 1)
    bg.inputs["Strength"].default_value = 0.6


def area(name, loc, target, size, energy, color):
    data = bpy.data.lights.new(name, "AREA")
    data.size = size
    data.energy = energy
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = loc
    d = Vector(target) - Vector(loc)
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return obj


def import_model(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def tint_materials(slug):
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            continue
        if m.name.startswith("BrakeCaliper"):
            bsdf.inputs["Base Color"].default_value = CANDY
        if m.name.startswith("CarPaint"):
            bsdf.inputs["Base Color"].default_value = (0.62, 0.52, 1.0, 1)
            bsdf.inputs["Metallic"].default_value = 0.85
            bsdf.inputs["Roughness"].default_value = 0.22
            if "Coat Weight" in bsdf.inputs:
                bsdf.inputs["Coat Weight"].default_value = 1.0
        if slug == "engine" and m.name.startswith("ValveIntake"):
            bsdf.inputs["Base Color"].default_value = (0.3, 0.6, 1.0, 1)
        if slug == "engine" and m.name.startswith("ValveExhaust"):
            bsdf.inputs["Base Color"].default_value = (1.0, 0.55, 0.2, 1)


def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def render(slug):
    fname, direction, zoom, offset = CARDS[slug]
    path = os.path.join(MODELS, fname)
    if not os.path.exists(path):
        print("skip", slug, "missing", path)
        return
    reset()
    scene = bpy.context.scene
    setup_render(scene)
    objs = import_model(path)
    bpy.context.view_layer.update()
    tint_materials(slug)

    lo, hi = bounds(objs)
    center = (lo + hi) / 2 + Vector(offset)
    radius = (hi - lo).length / 2

    cam_data = bpy.data.cameras.new("Cam")
    cam_data.lens = 70
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    fov = cam_data.angle
    dist = radius / math.sin(fov / 2) * 0.82 / zoom
    d = Vector(direction).normalized()
    cam.location = center + d * dist
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.clip_end = dist * 10

    s = radius
    area("Key", center + Vector((s * 1.5, -s * 2.0, s * 3.0)), center, s * 2.5, 900 * s * s, (1, 0.97, 0.95))
    area("RimPink", center + Vector((-s * 2.6, s * 1.4, s * 1.2)), center, s * 1.8, 1400 * s * s, (1, 0.3, 0.65))
    area("RimBlue", center + Vector((s * 2.6, s * 1.8, s * 0.8)), center, s * 1.8, 1000 * s * s, (0.45, 0.75, 1))
    area("Fill", center + Vector((0, -s * 3.0, -s * 0.2)), center, s * 3, 120 * s * s, (0.85, 0.8, 1))

    os.makedirs(OUT, exist_ok=True)
    png = os.path.join(OUT, f"lesson-{slug}.png")
    scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    try:
        from PIL import Image

        Image.open(png).save(os.path.join(OUT, f"lesson-{slug}.webp"), "WEBP", quality=86, method=6)
        os.remove(png)
    except ImportError:
        print("Pillow not available in Blender's Python; convert", png, "to webp separately")
    print("rendered", slug)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    for slug in argv or CARDS:
        render(slug)
