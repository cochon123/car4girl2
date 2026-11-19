import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { Block, Callout, CameraRig, LessonCanvas, LessonShell, type View } from '../../components/LessonShell'
import { damp, materialsNamed, node, rest, useModel } from '../../lib/models'
import { NodeLabel } from '../../three/NodeLabel'
import './hood.css'

type ItemId = 'oil' | 'coolant' | 'brake' | 'washer' | 'battery' | 'air'

const ITEMS: { id: ItemId; hs: string; label: string; sub: string; color: string; look: [number, number, number] }[] = [
  { id: 'oil', hs: 'HS_Dipstick', label: 'Engine oil', sub: 'the yellow loop', color: '#ffd23d', look: [0.15, 0.55, 0.6] },
  { id: 'coolant', hs: 'HS_Coolant', label: 'Coolant', sub: 'see-through tank', color: '#ff86c4', look: [0.1, 0.45, 0.55] },
  { id: 'brake', hs: 'HS_BrakeFluid', label: 'Brake fluid', sub: 'small tank, back', color: '#ffb547', look: [0.05, 0.45, 0.55] },
  { id: 'washer', hs: 'HS_Washer', label: 'Washer fluid', sub: 'the blue cap', color: '#4f8dff', look: [0.05, 0.45, 0.6] },
  { id: 'battery', hs: 'HS_Battery', label: 'Battery', sub: 'red +, black −', color: '#ff4d5e', look: [0.1, 0.5, 0.6] },
  { id: 'air', hs: 'HS_AirFilter', label: 'Air filter', sub: 'the big box', color: '#d6ff4f', look: [0.1, 0.5, 0.65] },
]

const PART_TO_ITEM: Record<string, ItemId> = {
  Dipstick: 'oil',
  DipstickTube: 'oil',
  OilCap: 'oil',
  CoolantReservoir: 'coolant',
  CoolantFluid: 'coolant',
  CoolantCap: 'coolant',
  BrakeFluidReservoir: 'brake',
  BrakeFluid: 'brake',
  BrakeFluidCap: 'brake',
  WasherCap: 'washer',
  WasherNeck: 'washer',
  Battery: 'battery',
  BatteryPos: 'battery',
  BatteryNeg: 'battery',
  AirBox: 'air',
}

// from assets-src/bay/manifest.json (fallbacks follow the contract)
const DIPSTICK_LENGTH = 0.55
const COOLANT_SCALE: [number, number] = [0.45, 1]
const BRAKE_SCALE: [number, number] = [0.45, 1]

type Bay = {
  selected: ItemId | null
  oilOut: boolean
  oilFilm: boolean
  coolant: number
  brake: number
  washerOpen: boolean
}

function itemFromObject(o: THREE.Object3D | null): ItemId | null {
  while (o) {
    const hit = PART_TO_ITEM[o.name]
    if (hit) return hit
    o = o.parent
  }
  return null
}

function BayModel({ bay, onPick, onViews }: { bay: Bay; onPick: (id: ItemId) => void; onViews: (v: Record<string, View>) => void }) {
  const { root } = useModel('bay')
  const rig = useMemo(() => {
    const g = (n: string) => node(root, n)
    const dip = g('Dipstick')
    const washer = g('WasherCap')
    const coolant = g('CoolantFluid')
    const brake = g('BrakeFluid')
    for (const o of [dip, washer, coolant, brake]) if (o) rest(o)
    materialsNamed(root, 'PlasticTranslucent').forEach((m) => {
      m.transparent = true
      m.opacity = Math.min(m.opacity, 0.42)
      m.depthWrite = false
      m.roughness = 0.25
    })
    const film = materialsNamed(root, 'OilFilm')
    const pos = materialsNamed(root, 'BatteryRed')
    const neg = materialsNamed(root, 'BatteryBlack')
    const glowCaps = {
      oil: [...materialsNamed(root, 'CapYellow')],
      washer: [...materialsNamed(root, 'CapBlue')],
      coolant: [...materialsNamed(root, 'Coolant')],
      brake: [...materialsNamed(root, 'BrakeFluidLiquid')],
      battery: [...pos, ...neg],
    } as Record<string, THREE.MeshStandardMaterial[]>
    Object.values(glowCaps)
      .flat()
      .forEach((m) => (m.userData.baseEmissive = m.emissive.clone()))
    return {
      dip,
      dipDir: dip ? new THREE.Vector3(0, 1, 0).applyQuaternion(rest(dip).q) : new THREE.Vector3(0, 1, 0),
      washer,
      coolant,
      brake,
      film,
      glowCaps,
      pull: 0,
      open: 0,
    }
  }, [root])

  // camera presets from the hotspots
  useEffect(() => {
    root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(root)
    const c = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3()).length()
    const views: Record<string, View> = {
      overview: [c.x + size * 0.05, c.y + size * 0.62, c.z + size * 0.62, c.x, c.y - size * 0.05, c.z - size * 0.05],
    }
    for (const it of ITEMS) {
      const hs = node(root, it.hs)
      if (!hs) continue
      const p = hs.getWorldPosition(new THREE.Vector3())
      views[it.id] = [p.x + it.look[0], p.y + it.look[1], p.z + it.look[2], p.x, p.y - 0.02, p.z]
    }
    // the dipstick reading view backs off to see the whole pulled-out blade
    const hsDip = node(root, 'HS_Dipstick')
    if (hsDip) {
      const p = hsDip.getWorldPosition(new THREE.Vector3())
      views.oilOut = [p.x + 0.45, p.y + 0.55, p.z + 0.9, p.x, p.y + DIPSTICK_LENGTH * 0.45, p.z]
    }
    onViews(views)
  }, [root, onViews])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    rig.pull = damp(rig.pull, bay.oilOut ? 1 : 0, 3.2, dt)
    if (rig.dip) rig.dip.position.copy(rest(rig.dip).p).addScaledVector(rig.dipDir, rig.pull * DIPSTICK_LENGTH)
    rig.film.forEach((m) => {
      m.transparent = true
      m.opacity = damp(m.opacity, bay.oilFilm ? 1 : 0, 6, dt)
    })

    rig.open = damp(rig.open, bay.washerOpen ? 1 : 0, 4, dt)
    if (rig.washer) {
      const r = rest(rig.washer)
      rig.washer.position.copy(r.p).add(new THREE.Vector3(0, rig.open * 0.05, 0).applyQuaternion(r.q))
      rig.washer.quaternion.copy(r.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rig.open * Math.PI * 1.5))
    }
    const lvl = (o: THREE.Object3D | null, v: number, [lo, hi]: [number, number]) => {
      if (!o) return
      const r = rest(o)
      const target = THREE.MathUtils.lerp(lo * 0.55, hi, v)
      o.scale.y = damp(o.scale.y, r.s.y * target, 5, dt)
    }
    lvl(rig.coolant, bay.coolant, COOLANT_SCALE)
    lvl(rig.brake, bay.brake, BRAKE_SCALE)

    // pulse the selected item
    const pulse = 0.5 + 0.5 * Math.sin(t * 4)
    for (const [k, mats] of Object.entries(rig.glowCaps)) {
      const on = bay.selected === k
      mats.forEach((m) => {
        const base = m.userData.baseEmissive as THREE.Color
        if (on) {
          m.emissive.copy(m.color)
          m.emissiveIntensity = 0.25 + pulse * 0.5
        } else {
          m.emissive.copy(base)
          m.emissiveIntensity = 1
        }
      })
    }
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const id = itemFromObject(e.object)
    if (id) {
      e.stopPropagation()
      onPick(id)
    }
  }

  return (
    <>
      <primitive
        object={root}
        onClick={onClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          if (itemFromObject(e.object)) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
      {ITEMS.map((it) => (
        <NodeLabel
          key={it.id}
          obj={node(root, it.hs)}
          label={it.label}
          sub={it.sub}
          color={it.color}
          active={bay.selected === it.id}
          dim={bay.selected !== null && bay.selected !== it.id}
          onClick={() => onPick(it.id)}
        />
      ))}
      <NodeLabel obj={node(root, 'HS_FuseBox')} label="Fuse box" sub="little circuit breakers" dim color="#bba9c6" />
      <NodeLabel obj={node(root, 'HS_Radiator')} label="Radiator" sub="cools the coolant" dim color="#bba9c6" side="left" />
    </>
  )
}

const OIL_STEPS = ['Pull it out', 'Wipe it clean', 'Push it all the way back in', 'Pull it out again and read it'] as const

export default function HoodLesson() {
  const [bay, setBay] = useState<Bay>({ selected: null, oilOut: false, oilFilm: true, coolant: 0.85, brake: 0.9, washerOpen: false })
  const [oilStep, setOilStep] = useState(0)
  const [reading, setReading] = useState<'ok' | 'low' | 'high'>('ok')
  const [views, setViews] = useState<Record<string, View> | null>(null)
  const [checked, setChecked] = useState<ItemId[]>([])
  const panelRefs = useRef<Partial<Record<ItemId, HTMLElement | null>>>({})

  const pick = (id: ItemId) => {
    setBay((b) => ({ ...b, selected: id, oilOut: id === 'oil' ? b.oilOut : false }))
    setChecked((c) => (c.includes(id) ? c : [...c, id]))
    panelRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const view: View | null = !views ? null : bay.selected === 'oil' && bay.oilOut ? (views.oilOut ?? views.oil) : bay.selected ? (views[bay.selected] ?? views.overview) : views.overview

  const doOil = () => {
    const next = (oilStep + 1) % (OIL_STEPS.length + 1)
    setOilStep(next)
    if (next === 1) setBay((b) => ({ ...b, selected: 'oil', oilOut: true, oilFilm: true }))
    if (next === 2) setBay((b) => ({ ...b, oilFilm: false }))
    if (next === 3) setBay((b) => ({ ...b, oilOut: false }))
    if (next === 4) {
      setReading((r) => (r === 'ok' ? 'low' : r === 'low' ? 'high' : 'ok'))
      setBay((b) => ({ ...b, oilOut: true, oilFilm: true }))
    }
    if (next === 0) setBay((b) => ({ ...b, oilOut: false, oilFilm: true }))
  }

  const coolantState = bay.coolant < 0.2 ? 'low' : 'ok'
  const brakeState = bay.brake < 0.2 ? 'low' : 'ok'

  return (
    <LessonShell
      slug="under-the-hood"
      stage={
        <LessonCanvas fov={36}>
          {view && <CameraRig view={view} minDistance={0.25} maxDistance={4} />}
          <BayModel bay={bay} onPick={pick} onViews={setViews} />
        </LessonCanvas>
      }
      stageOverlay={
        <div className="stage-hud">
          <div className="tag-pill">
            <span className="mono hood-count">{checked.length}/6</span> things found
          </div>
          {bay.selected && (
            <button className="btn btn--ghost btn--small" onClick={() => setBay((b) => ({ ...b, selected: null, oilOut: false }))}>
              ← Whole bay
            </button>
          )}
        </div>
      }
    >
      <Block>
        <p>
          Opening the hood is less scary than it looks. There are <strong>six things</strong> in here you can check yourself in about five minutes, no tools needed. Tap the glowing
          labels or the parts themselves.
        </p>
        <Callout tone="stop">
          Check with the <strong>engine off and cooled down</strong>, the car on level ground, and the parking brake on. Keep hair and scarves clear of the belts.
        </Callout>
      </Block>

      <div className="hood-items">
        {ITEMS.map((it) => (
          <section
            key={it.id}
            ref={(el) => {
              panelRefs.current[it.id] = el
            }}
            className={`hood-item ${bay.selected === it.id ? 'is-on' : ''}`}
            style={{ '--c': it.color } as CSSProperties}
          >
            <button className="hood-item__head" onClick={() => pick(it.id)} aria-expanded={bay.selected === it.id}>
              <span className="hood-item__dot" />
              <span className="hood-item__title">{it.label}</span>
              <span className="hood-item__check">{checked.includes(it.id) ? '✓' : ''}</span>
            </button>
            {bay.selected === it.id && <div className="hood-item__body">{renderItem(it.id)}</div>}
          </section>
        ))}
      </div>

      <Callout tone="tip">
        <strong>Where is everything in my car?</strong> The layout changes between models, but the colours are almost universal: yellow or orange for things you check, blue
        for washer fluid. Your owner’s manual has a labelled photo of your exact engine bay.
      </Callout>
    </LessonShell>
  )

  function renderItem(id: ItemId) {
    switch (id) {
      case 'oil':
        return (
          <>
            <p>
              Oil keeps the engine’s metal parts from grinding each other to bits. Check it about <strong>once a month</strong>, with the engine off for at least 5 minutes so
              the oil drains back down.
            </p>
            <ol className="oil-steps">
              {OIL_STEPS.map((s, i) => (
                <li key={s} className={oilStep > i ? 'is-done' : oilStep === i ? 'is-next' : ''}>
                  {s}
                </li>
              ))}
            </ol>
            <button className="btn btn--candy btn--small" onClick={doOil}>
              {oilStep < OIL_STEPS.length ? `${oilStep + 1}. ${OIL_STEPS[oilStep]}` : 'Put it back & start over'}
            </button>
            {oilStep === 1 && <p className="note">The first pull is always smeared from the tube, so it tells you nothing. Wipe it on a rag or paper towel.</p>}
            {oilStep === 4 && (
              <div className="dip-read">
                <DipstickReading level={reading} />
                {reading === 'ok' && (
                  <p>
                    <strong>Between the two marks: perfect.</strong> Amber to dark brown and see-through is normal. Done!
                  </p>
                )}
                {reading === 'low' && (
                  <p>
                    <strong>At or below MIN: add some oil.</strong> Pour a little at a time through the cap with the oil-can symbol, wait a minute, re-check. The right type (like
                    “0W-20”) is in your manual and often on the cap.
                  </p>
                )}
                {reading === 'high' && (
                  <p>
                    <strong>Above MAX: too much.</strong> Overfilling can damage the engine too. Don’t drive far; a garage can drain the extra in minutes.
                  </p>
                )}
                <p className="note">
                  Oil that’s black and gritty means it’s due for a change. <strong>Milky or foamy</strong> oil can mean coolant is getting in: get it looked at soon.
                </p>
                <p className="note">Tap “start over” to see another reading.</p>
              </div>
            )}
          </>
        )
      case 'coolant':
        return (
          <>
            <p>
              Coolant carries heat away from the engine to the radiator. The tank is see-through so you can read it <strong>without opening it</strong>: the level should sit
              between the MIN and MAX lines when the engine is cold.
            </p>
            <Slider label="Try a level" value={bay.coolant} onChange={(v) => setBay((b) => ({ ...b, coolant: v }))} />
            <p className={`status status--${coolantState}`}>
              {coolantState === 'ok' ? 'Looks good. Nothing to do.' : 'Below MIN: top up with the coolant type in your manual (cold engine only), and get it checked if it keeps dropping.'}
            </p>
            <Callout tone="stop">
              <strong>Never open the coolant cap when the engine is warm.</strong> It is under pressure and can spray boiling liquid. Wait until it is cold to the touch.
            </Callout>
          </>
        )
      case 'brake':
        return (
          <>
            <p>
              This small tank feeds the hydraulic system that makes your brakes work. It sits high, usually near the windshield on the driver’s side. Read it through the
              plastic.
            </p>
            <Slider label="Try a level" value={bay.brake} onChange={(v) => setBay((b) => ({ ...b, brake: v }))} />
            <p className={`status status--${brakeState}`}>
              {brakeState === 'ok'
                ? 'Between the lines: all good.'
                : 'Low brake fluid usually means worn pads or a leak. Don’t just top it up: get the brakes checked soon.'}
            </p>
            <p className="note">Fresh fluid is clear to golden. Dark brown fluid is old and should be replaced (typically every 2 years).</p>
          </>
        )
      case 'washer':
        return (
          <>
            <p>
              The one you can top up any time, as often as you like. Look for the <strong>blue cap</strong> with a little windshield symbol.
            </p>
            <button className="btn btn--candy btn--small" onClick={() => setBay((b) => ({ ...b, washerOpen: !b.washerOpen }))}>
              {bay.washerOpen ? 'Close the cap' : 'Open the cap'}
            </button>
            <p className="note">
              Use proper washer fluid, not plain water: water freezes in winter and grows gunk in summer. In cold climates, buy a winter mix rated for your lowest temperatures.
            </p>
          </>
        )
      case 'battery':
        return (
          <>
            <p>
              The battery starts the car and runs the electronics before the engine wakes up. <strong>Red is plus (+), black is minus (−).</strong> Look for white or green
              crusty powder on the terminals: that’s corrosion and can stop the car starting.
            </p>
            <div className="jump">
              <p className="kicker">Jump-start order</p>
              <ol>
                <li>
                  <span className="clamp clamp--red" /> Red to the <strong>dead</strong> battery’s +
                </li>
                <li>
                  <span className="clamp clamp--red" /> Other red to the <strong>good</strong> battery’s +
                </li>
                <li>
                  <span className="clamp clamp--black" /> Black to the <strong>good</strong> battery’s −
                </li>
                <li>
                  <span className="clamp clamp--black" /> Last black to bare <strong>metal</strong> on the dead car, away from the battery
                </li>
              </ol>
              <p className="note">Start the good car, wait a couple of minutes, then try yours. Remove the clamps in reverse order. Most batteries last 3 to 5 years.</p>
            </div>
          </>
        )
      case 'air':
        return (
          <>
            <p>
              Your engine breathes through this filter, which catches dust and bugs. A clogged one makes the engine work harder. It’s usually replaced every{' '}
              <strong>15,000 to 30,000 miles</strong> (25,000 to 50,000 km), or sooner on dusty roads.
            </p>
            <p className="note">Many air boxes open with a few clips and no tools. Ask your garage to show you the old filter next to a new one: the difference is shocking.</p>
          </>
        )
    }
  }
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span className="mono">
        {label} <span>{value < 0.2 ? 'below MIN' : value > 0.95 ? 'MAX' : 'between'}</span>
      </span>
      <input className="range" type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ '--fill': `${value * 100}%` } as CSSProperties} />
    </label>
  )
}

function DipstickReading({ level }: { level: 'ok' | 'low' | 'high' }) {
  // blade drawn tip-right; oil coats from the tip upward. MIN (nearer the tip) at x=330, MAX at x=250
  const oilTo = level === 'ok' ? 292 : level === 'low' ? 352 : 236
  return (
    <svg viewBox="0 0 420 70" className="dip-svg" role="img" aria-label={`Dipstick reading: ${level === 'ok' ? 'between MIN and MAX' : level === 'low' ? 'below MIN' : 'above MAX'}`}>
      <rect x="10" y="29" width="390" height="12" rx="3" fill="#c9c2cf" />
      <path d="M400 29 q12 6 0 12 z" fill="#c9c2cf" />
      <rect x={oilTo} y="29" width={412 - oilTo} height="12" rx="3" fill="#b5771d" opacity="0.9" />
      <rect x="250" y="25" width="80" height="20" fill="none" stroke="#fff" strokeDasharray="3 3" opacity="0.6" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={254 + i * 9} y1="29" x2={250 + i * 9} y2="41" stroke="#3a2c44" strokeWidth="1.2" />
      ))}
      <text x="250" y="18" fill="#fff" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">
        MAX
      </text>
      <text x="330" y="18" fill="#fff" fontSize="12" fontFamily="JetBrains Mono" textAnchor="middle">
        MIN
      </text>
      <text x="14" y="62" fill="#7f6d8c" fontSize="10" fontFamily="JetBrains Mono">
        handle ←
      </text>
      <text x="406" y="62" fill="#7f6d8c" fontSize="10" fontFamily="JetBrains Mono" textAnchor="end">
        → tip
      </text>
    </svg>
  )
}
