# Car4Girl2

**Cars, finally explained.** An interactive car school with hands-on 3D lessons, made for
people (mostly girls and young women) who are new to cars and tired of being told
“it’s complicated”.

| # | Lesson | What you do |
|---|---|---|
| 01 | How an engine breathes | Scrub through the 4-stroke cycle in a cutaway cylinder |
| 02 | The 5-minute hood check | Pull the dipstick, read coolant & brake fluid, find the washer cap |
| 03 | Read your tire like a pro | Decode `205/55 R16 91V`, coin-test the tread, set the pressure |
| 04 | How one foot stops 1.4 tons | Hold the brake, watch the pads clamp and the disc glow |
| 05 | Decode your dashboard | Turn the key, learn the colours, take the warning-light quiz |
| 06 | Change a flat. Yes, you. | Jack points, wheel swap, the lug-nut star pattern |

## Stack

- Vite + React + TypeScript
- three.js via `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`
- 3D models built procedurally in Blender (Python) — see `assets-src/` and
  [`docs/asset-contract.md`](docs/asset-contract.md) for node names, pivots and axes the
  web code relies on.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
```

Rebuild a model (Blender 5.2):

```bash
blender -b -P assets-src/car/build_car.py
```

Deployed on Vercel as a static SPA (`vercel.json` rewrites every non-asset route to
`index.html`).
