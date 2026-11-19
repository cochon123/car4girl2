# Car4Girl2 — 3D asset contract

Every model on the site is built procedurally in Blender (Python/`bpy`) and exported
as glTF binary (`.glb`). The web app (three.js / react-three-fiber) finds parts **by
node name**, moves them, and swaps some materials. This file is the interface between
the Blender side and the web side. If you change a name, pivot or axis, update this
file and the model's `manifest.json` in the same change.

## Global rules (all models)

- **Units:** meters, real-world scale.
- **Axes (as seen in three.js after export):** +Y is up, ground plane is `y = 0` where a
  model touches the ground. In Blender that is +Z up; the default glTF exporter setting
  (`export_yup=True`) does the conversion. Blender `(x, y, z)` becomes glTF `(x, z, -y)`,
  so Blender **-Y** becomes three.js **+Z**.
- **Pivots matter.** Every node listed below must have its object origin exactly where
  the contract says, with rotation and scale applied (`Ctrl+A`) on the mesh data, so a
  node's local axes equal its parent's axes unless the contract says otherwise. The web
  code animates by changing `position` / `rotation` of these nodes.
- **Materials:** Principled BSDF only, with constant values or small baked image
  textures (≤ 1024 px, JPEG/WebP/PNG). Procedural shader nodes (Noise, Voronoi, Wave…) do
  **not** survive glTF export; bake them or replace them with real geometry. Use
  `emission` for lights. Name materials exactly as listed: the site overrides some of
  them by name.
- **No real brands.** No real manufacturer logos, badges, grille shapes or recognisable
  real car designs. Original design only. A small "C4G2" badge is allowed.
- **Export:** `bpy.ops.export_scene.gltf(export_format='GLB', export_apply=True,
  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
  export_yup=True)`, no cameras, no lights, plus empties (named `HS_*`) kept as nodes.
  Check the triangle and file-size budget for each model.
- **Smooth shading** with auto-smooth / weighted normals; bevel hard edges (the web
  renders with a studio environment map, and crisp highlights on bevels are what make it
  look expensive).
- **Hotspot anchors:** empties named `HS_<Name>` mark where a floating label points.
  Place each one on the surface of the part it describes (slightly outside it).
- Each model folder `assets-src/<model>/` has: the build script (`build_<model>.py`,
  runnable headless with `blender -b -P build_<model>.py`), the `.blend`, preview
  renders (`preview_*.png`), and `manifest.json`:

```json
{
  "file": "public/models/car.glb",
  "triangles": 123456,
  "bytes": 4567890,
  "nodes": { "Wheel_FL": { "pivot": [x, y, z], "notes": "rolls about local X" } },
  "hotspots": { "HS_Engine": [x, y, z] },
  "constants": { "anything the web code needs": 0.0 }
}
```

Coordinates in the manifest are **three.js world coordinates** (Y-up, after export).

---

## 1. `public/models/car.glb` — the hero car

An original, friendly-but-sporty modern compact hatchback (think: confident, rounded,
premium; short overhangs, wide stance, big wheels for its size). It is the star of the
landing page: it spins on a turntable, it is shown with a colour-shifting paint, and it
**explodes into its parts** as the user scrolls.

- Size about 4.10 m long, 1.80 m wide, 1.45 m tall, wheelbase about 2.60 m.
- Front of the car points to **+Z** (three.js). Ground contact at `y = 0`. Centered on
  `x = 0`, and the midpoint between the axles at `z = 0`.
- Budget: ≤ 200k triangles, ≤ 6 MB `.glb`.

Top-level nodes (direct children of the scene root, each with origin at the part's own
centre unless stated). The site explodes the car by translating each of these:

| Node | What | Pivot / motion |
|---|---|---|
| `Body` | Painted shell: bumpers, fenders, roof, sills, mirrors (mirror caps may be painted) | centre of the shell |
| `Hood` | Bonnet panel | origin on the hinge line (rear edge, near windshield); opening = rotate about local **−X** (positive angle about −X lifts the front edge up) up to ~70° |
| `Door_FL`, `Door_FR`, `Door_RL`, `Door_RR` | Doors incl. their window glass + handles | origin on the front hinge line; opening = rotate about local Y, ~60° outward |
| `Hatch` | Rear tailgate incl. rear window | origin on the hinge at the roof; open = rotate about local X, rear edge up |
| `Glass` | Windshield + fixed glass | centre |
| `Interior` | Seats, dashboard, steering wheel, centre console | centre |
| `Headlights` | Both headlight units | centre |
| `Taillights` | Both taillight units | centre |
| `Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR` | Tire + rim + brake disc + caliper | origin **exactly at the wheel centre (axle)**; rolling forward = rotate about local +X by a positive angle. Left/right: see note below |
| `Engine` | A believable inline-4 with intake, exhaust manifold, belt, sitting in the engine bay (hidden by the hood in normal view, revealed when exploded) | centre |
| `Battery` | 12 V battery in the bay (red + terminal, black − terminal) | centre |
| `Radiator` | Radiator + fan behind the grille | centre |
| `Exhaust` | Pipe from engine to muffler to tailpipe(s) | centre |
| `FuelTank` | Tank under the rear seats | centre |
| `Suspension` | 4 coil-over struts, lower arms | centre |
| `Chassis` | Floor pan, subframes (dark, matte) | centre |

**Left/right:** the driver's side is the car's **left** (as if sitting in it, looking
forward). With the front at +Z and +Y up, the car's left side is **+X**. So `Wheel_FL`
is at `(+x, r, +z)`, `Wheel_FR` at `(−x, r, +z)`, `Wheel_RL` at `(+x, r, −z)`,
`Wheel_RR` at `(−x, r, −z)`. Same for doors.

Inside each `Wheel_*` (children, same pivot as parent is fine): `Tire`, `Rim`,
`BrakeDisc`, `Caliper`. Tire about 205/55 R17-ish proportions with real tread geometry.

Materials (exact names): `CarPaint` (body colour; the site replaces it with an
iridescent clear-coat), `Glass`, `Chrome`, `TrimBlack` (gloss black trim),
`PlasticMatte` (matte black plastics), `Rubber`, `RimAlloy`, `BrakeDisc`,
`BrakeCaliper` (the site will colour it hot pink), `Interior` (+ optional `InteriorAccent`),
`HeadlightEmissive`, `TaillightEmissive`, `EngineMetal`, `EngineAccent`.

Hotspots: `HS_Engine`, `HS_Battery`, `HS_Brakes` (front-left wheel caliper), `HS_Tire`
(front-left tire sidewall), `HS_Headlights`, `HS_Fuel` (fuel door, rear right),
`HS_Exhaust`, `HS_Suspension`, `HS_JackPoint_FL`, `HS_JackPoint_FR`,
`HS_JackPoint_RL`, `HS_JackPoint_RR` (pinch-weld jacking points on the sills).

---

## 2. `public/models/engine-cutaway.glb` — single-cylinder 4-stroke cutaway

A beautiful, half-section ("cutaway") single cylinder from a car engine, used to teach
intake → compression → power → exhaust. The cut faces should be visible and distinct
(e.g. a flat "cut" material). The web code runs the kinematics, so the geometry must
follow these numbers exactly:

- Crankshaft axis along **X**, through the origin `(0, 0, 0)`. Things are viewed from **+X**
  looking toward −X (the cut plane faces +X, i.e. the cylinder is cut at `x = 0` and the
  `x > 0` half of the block/head/cylinder walls is removed; moving parts stay whole).
- Crank throw radius `r = 0.043 m` (stroke 86 mm). Connecting rod centre-to-centre length
  `L = 0.140 m`. Bore `0.086 m`.
- At crank angle `θ = 0` the crank pin is straight up (TDC). The crank pin centre is at
  `(0, r·cosθ, r·sinθ)` when the `Crank` node is rotated by `θ` about +X.
- Wrist-pin height above crank axis: `y(θ) = r·cosθ + sqrt(L² − (r·sinθ)²)`.

| Node | Pivot / motion |
|---|---|
| `Crank` | crankshaft + counterweights + crank pin; origin at `(0,0,0)`; rotates about local X. Modelled at θ = 0 (pin up). |
| `ConRod` | origin at the **small end (wrist pin centre)**, modelled hanging straight down: big end centre at local `(0, −L, 0)`. The web sets its position to the wrist pin and its rotation about X. |
| `Piston` | origin at the **wrist pin centre**; modelled with origin at `(0, r + L, 0)` (TDC). Moves along Y only. Include rings. |
| `IntakeValve`, `ExhaustValve` | origin at the valve's **closed** position (centre of the valve head face). The node is rotated so its local **−Y** is the opening direction along the stem (into the cylinder). Open = translate along local −Y by up to `0.009 m`. Intake on the −Z side, exhaust on the +Z side. |
| `IntakeCam`, `ExhaustCam` | camshafts over each valve, origin on their own axis (parallel to X); rotate about local X at half crank speed. |
| `SparkPlug` | static; child empty `SparkTip` at the electrode gap. |
| `Block` | cut-away block + cylinder liner (static). |
| `Head` | cut-away head with ports (static). |
| `IntakePort`, `ExhaustPort` | the port passages (static, separate so the site can tint them). |
| `Flywheel` | optional, on the crank axis at −X side; rotates with `Crank`. |

Constants for `manifest.json`: `r`, `L`, `bore`, `pistonCrownOffset` (distance from wrist pin centre up to the flat
piston crown), `deckY` (Y of the combustion chamber roof / head deck at the cylinder axis),
`cylinderAxisZ` (should be 0). The site draws the coloured gas between the piston crown
and `deckY` itself, so leave the cylinder bore empty.

Materials: `Cast` (block/head: warm grey cast metal), `Cut` (section faces: a clean
contrasting flat colour, e.g. light warm grey or pale pink), `Steel`, `Aluminium`,
`Brass`/`Copper` (optional), `Ceramic` (spark plug insulator), `ValveIntake`,
`ValveExhaust` (so the site can tint them blue / orange).

Hotspots: `HS_Piston`, `HS_Crank`, `HS_ConRod`, `HS_IntakeValve`, `HS_ExhaustValve`,
`HS_SparkPlug`, `HS_Cylinder`.

Budget: ≤ 120k triangles, ≤ 3 MB.

---

## 3. `public/models/wheel-brake.glb` — wheel + disc brake

One road wheel with a disc brake, shown close-up. Used for: reading the tire sidewall
code, the brake-pad squeeze animation, and the lug-nut "star pattern" mini game.

- Axle along **X**. Wheel centre at the origin. The **outer (visible) face of the wheel
  points to +X**. (So the wheel stands upright, rolling about X, tire bottom at
  `y = −0.316`.)
- Tire **205/55 R16** with real proportions: width 0.205 m, sidewall height
  0.11275 m, rim diameter 16 in (0.4064 m) → overall diameter ≈ 0.632 m.
- Raised sidewall lettering on the outer sidewall as real geometry in a separate mesh
  `SidewallText`: the big size code `205/55 R16 91V`, a made-up tire name
  (e.g. `GIRL2 GRIP`), and a small `DOT 4B2X 4524` date code. Also tread-wear indicator
  bumps in the grooves (`TreadWearBars`). Realistic tread pattern (as geometry).

Node tree:

```
WheelAssembly (origin 0,0,0)
├── Spin            ← rotates about X (everything that turns with the wheel)
│   ├── Tire
│   ├── SidewallText
│   ├── TreadWearBars
│   ├── Rim
│   ├── Hub
│   ├── BrakeDisc   (ventilated disc, drilled or slotted)
│   ├── ValveStem
│   └── LugNut_1 … LugNut_5   (5-lug pattern, PCD 0.1143 m; LugNut_1 at 12 o'clock,
│                               numbered clockwise as seen from +X; origin at each
│                               nut's centre; removal = translate +X)
└── Static          ← does not rotate
    ├── Caliper      (sits at the top-rear of the disc, about 10 o'clock seen from +X)
    ├── CaliperPiston
    ├── BrakePad_Inner (origin at the pad's friction face centre; clamp = translate +X)
    ├── BrakePad_Outer (origin at the pad's friction face centre; clamp = translate −X)
    └── KnuckleStub (optional suspension upright stub)
```

Pads are modelled **released**, with a 0.002 m gap to the disc on each side
(`padGap` in the manifest). Materials: `Rubber`, `RubberText` (sidewall letters, slightly
lighter so they read), `RimAlloy`, `BrakeDisc`, `BrakeCaliper`, `BrakePad`, `Steel`,
`Chrome` (lug nuts).

Hotspots: `HS_Width`, `HS_AspectRatio`, `HS_RimSize`, `HS_LoadSpeed`, `HS_DOT`,
`HS_Tread`, `HS_TreadWearBar`, `HS_ValveStem`, `HS_Disc`, `HS_Caliper`, `HS_Pad`.
Constants: `padGap`, `tireRadius`, `rimRadius`, `pcd`.

Budget: ≤ 120k triangles, ≤ 3 MB.

---

## 4. `public/models/engine-bay.glb` — under the hood

The view a beginner sees when they open the hood of a normal modern petrol hatchback,
used for the "5-minute check" lesson. Viewer stands at the front of the car looking
down/back into the bay. Include the front fender edges, the raised hood (with prop rod)
at the top, the radiator support and front of the windshield cowl, so it reads as a car.

- Front of the car toward **+Z**; bay centred at `x = 0`; `y = 0` at the ground is not
  needed here: put the **origin at the centre of the bay opening**, top surface of the
  fenders at about `y = 0`.
- Approx. bay size 1.5 m wide × 0.9 m deep.

Interactive nodes (all separate, origins as stated):

| Node | What | Pivot / motion |
|---|---|---|
| `Dipstick` | Bright yellow/orange loop handle + the full-length blade with `MIN`/`MAX` marks and an oil-wet tip (tip material `OilFilm`). Sits in its tube. | origin at the tube mouth; the node is oriented so local **+Y** is the pull-out direction; pulled out = translate along local +Y by `dipstickLength` (≈0.55 m). |
| `DipstickTube` | static tube | — |
| `OilCap` | on the valve cover, with the oil-can symbol embossed | origin at cap centre; unscrew = rotate about local Y + rise along local Y |
| `CoolantReservoir` | translucent white plastic tank with MIN/MAX moulded lines | — |
| `CoolantFluid` | the coolant inside (pink, material `Coolant`) | origin at the **bottom** of the tank interior, so scaling Y sets the level (scale 1 = at MAX) |
| `CoolantCap` | pressure cap (warning symbol embossed) | origin at cap centre |
| `BrakeFluidReservoir` | small translucent reservoir near the windshield on the driver's side (+X) | — |
| `BrakeFluid` | amber fluid, material `BrakeFluidLiquid` | origin at bottom, scale Y = level |
| `BrakeFluidCap` | | origin at cap centre |
| `WasherCap` | blue cap with windshield-spray symbol | origin at cap centre |
| `WasherNeck` | | — |
| `Battery` | 12 V battery with `BatteryPos` (red cover, +) and `BatteryNeg` (black, −) as child nodes | centre |
| `AirBox` | air filter box with clips | centre |
| `FuseBox` | | centre |
| `EngineCover` | plastic engine cover over an inline-4 | centre |
| `Engine` | the engine, belts, alternator visible around the cover | centre |
| `Radiator` | top of the radiator + hoses | centre |
| `Bay` | everything static (fenders, strut towers, firewall, cowl, raised hood, prop rod, hoses, wiring loom) | — |

Materials: `CarPaint`, `PlasticMatte`, `PlasticTranslucent` (reservoirs), `Coolant`,
`BrakeFluidLiquid`, `OilFilm`, `CapYellow`, `CapBlue`, `CapBlack`, `Metal`, `Rubber`,
`BatteryRed`, `BatteryBlack`, `Copper`.

Hotspots: `HS_Dipstick`, `HS_OilCap`, `HS_Coolant`, `HS_BrakeFluid`, `HS_Washer`,
`HS_Battery`, `HS_AirFilter`, `HS_FuseBox`, `HS_Radiator`.
Constants: `dipstickLength`, `dipstickMinY`/`dipstickMaxY` (positions of the MIN/MAX
marks measured along the blade from the tip), coolant/brake fluid MIN and MAX scale values.

Budget: ≤ 200k triangles, ≤ 6 MB.
