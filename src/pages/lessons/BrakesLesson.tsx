import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import { Block, Callout, CameraRig, LessonCanvas, LessonShell, type View } from '../../components/LessonShell'
import { damp, materialsNamed, node, rest, useModel } from '../../lib/models'
import { NodeLabel } from '../../three/NodeLabel'
import { SoftShadow } from '../../three/Studio'
import './brakes.css'

const PAD_GAP = 0.002
const TIRE_R = 0.316
const CRUISE = 100 / 3.6
const SLOWMO = 0.085

type Sim = { pressed: boolean; v: number; temp: number; clamp: number; peak: number }

const VIEWS: Record<string, View> = {
  overview: [1.15, 0.35, 0.75, 0, 0.02, 0],
  caliper: [0.42, 0.42, -0.42, 0, 0.17, -0.1],
}

function heatColor(t: number, out: THREE.Color) {
  // 200 °C: nothing; 400 °C: dull red; 700 °C: orange
  const k = THREE.MathUtils.clamp((t - 250) / 450, 0, 1)
  out.setRGB(1, 0.18 + k * 0.4, 0.05 + k * 0.08)
  return k
}

function BrakeWheel({ sim }: { sim: RefObject<Sim> }) {
  const { root } = useModel('wheel')
  const rig = useMemo(() => {
    const g = (n: string) => node(root, n)
    const spin = g('Spin')
    const inner = g('BrakePad_Inner')
    const outer = g('BrakePad_Outer')
    const piston = g('CaliperPiston')
    for (const o of [spin, inner, outer, piston]) if (o) rest(o)
    for (const m of materialsNamed(root, 'BrakeCaliper')) m.color.set('#ff3d9a')
    const disc = materialsNamed(root, 'BrakeDisc')
    return { spin, inner, outer, piston, disc }
  }, [root])
  const c = useMemo(() => new THREE.Color(), [])

  useFrame((_, dt) => {
    const s = sim.current
    s.clamp = damp(s.clamp, s.pressed ? 1 : 0, 14, dt)
    const braking = s.clamp > 0.6
    if (braking) {
      const dv = Math.min(s.v, 8.5 * dt)
      s.v -= dv
      s.temp += 3.6 * dv * (s.v + dv / 2) * 0.14 // ≈ +195 °C per full stop from 100 km/h
    } else {
      s.v = Math.min(CRUISE, s.v + 3.2 * dt)
    }
    s.temp = 25 + (s.temp - 25) * Math.exp(-dt / 30)
    s.peak = Math.max(s.peak, s.temp)

    const gap = PAD_GAP * s.clamp
    if (rig.inner) rig.inner.position.copy(rest(rig.inner).p).add({ x: gap, y: 0, z: 0 } as THREE.Vector3)
    if (rig.outer) rig.outer.position.copy(rest(rig.outer).p).add({ x: -gap, y: 0, z: 0 } as THREE.Vector3)
    if (rig.piston) rig.piston.position.copy(rest(rig.piston).p).add({ x: gap, y: 0, z: 0 } as THREE.Vector3)
    if (rig.spin) rig.spin.rotation.x += (s.v / TIRE_R) * SLOWMO * dt

    const k = heatColor(s.temp, c)
    rig.disc.forEach((m) => {
      m.emissive.copy(c)
      m.emissiveIntensity = k * 2.2
    })
  })

  return (
    <>
      <primitive object={root} />
      <SoftShadow y={-0.318} scale={2} opacity={0.7} />
      <NodeLabel obj={node(root, 'HS_Caliper')} label="Caliper" sub="the clamp" />
      <NodeLabel obj={node(root, 'HS_Pad')} label="Brake pads" sub="the grippy bit" side="left" color="#ffb547" />
      <NodeLabel obj={node(root, 'HS_Disc')} label="Disc (rotor)" sub="spins with the wheel" color="#7cc8ff" />
    </>
  )
}

export default function BrakesLesson() {
  const sim = useRef<Sim>({ pressed: false, v: CRUISE, temp: 40, clamp: 0, peak: 40 })
  const [hud, setHud] = useState({ v: 100, temp: 40, clamp: 0, peak: 40 })
  const [view, setView] = useState<View>(VIEWS.overview)
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const s = sim.current
      setHud({ v: s.v * 3.6, temp: s.temp, clamp: s.clamp, peak: s.peak })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const press = (on: boolean) => {
    sim.current.pressed = on
    setPressed(on)
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest('button, input')) {
        e.preventDefault()
        press(true)
      }
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && press(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const glowing = hud.temp > 400
  return (
    <LessonShell
      slug="brakes"
      stage={
        <LessonCanvas fov={34}>
          <CameraRig view={view} minDistance={0.25} maxDistance={3} />
          <BrakeWheel sim={sim} />
        </LessonCanvas>
      }
      stageOverlay={
        <>
          <div className="stage-hud">
            <div className="gauges">
              <div className="gauge glass">
                <span className="mono">speed</span>
                <strong>{Math.round(hud.v)}</strong>
                <em>km/h</em>
              </div>
              <div className={`gauge glass ${glowing ? 'is-hot' : ''}`}>
                <span className="mono">disc temp</span>
                <strong>{Math.round(hud.temp)}</strong>
                <em>°C</em>
              </div>
            </div>
            <span className="tag-pill mono slowmo">slow-motion ×{Math.round(1 / SLOWMO)}</span>
          </div>
          <div className="brake-cta">
            <button
              className={`pedal ${pressed ? 'is-down' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                press(true)
              }}
              onPointerUp={() => press(false)}
              onPointerCancel={() => press(false)}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && press(true)}
              onKeyUp={(e) => (e.key === 'Enter' || e.key === ' ') && press(false)}
              aria-pressed={pressed}
            >
              <span className="pedal__pad" aria-hidden="true" />
              <span>{pressed ? 'Braking…' : 'Hold to brake'}</span>
            </button>
            <span className="mono brake-cta__hint">or hold space</span>
          </div>
        </>
      }
    >
      <Block>
        <p>
          A car weighs about as much as a small hippo. To stop it, your brakes squeeze a spinning metal disc between two pads, and the friction turns all that speed into{' '}
          <strong>heat</strong>. Hold the button and watch the pads clamp.
        </p>
        <div className="row-btns">
          <button className="btn btn--ghost btn--small" onClick={() => setView(VIEWS.caliper)}>
            Zoom on the caliper
          </button>
          <button className="btn btn--ghost btn--small" onClick={() => setView(VIEWS.overview)}>
            Whole wheel
          </button>
        </div>
      </Block>

      <Block title="From your foot to the wheel" kicker="Hydraulics, basically magic">
        <Hydraulics on={hud.clamp} />
        <ol>
          <li>
            You press the pedal. A <strong>booster</strong> multiplies your push several times over.
          </li>
          <li>
            The <strong>master cylinder</strong> pushes brake fluid down thin pipes to all four wheels.
          </li>
          <li>Fluid can’t be squashed, so the pressure arrives at every wheel instantly, like squeezing a full water balloon.</li>
          <li>
            In each <strong>caliper</strong>, the fluid pushes a piston that squeezes the pads onto the disc.
          </li>
        </ol>
      </Block>

      <Block title="Can you make it glow?" kicker="Brake again and again">
        <p>
          Each hard stop from 100 km/h dumps a burst of heat into the disc. Do it over and over without letting it cool (like riding the brakes down a mountain) and it
          glows. Best so far: <strong className="peak">{Math.round(hud.peak)} °C</strong>.
        </p>
        <Callout tone="warn">
          Very hot brakes <strong>fade</strong>: the pedal feels the same but the car stops less. On long downhills, shift to a lower gear (or “B” / “L” in an automatic or EV)
          so the engine or motor does some of the braking.
        </Callout>
      </Block>

      <Block title="When your brakes are asking for help">
        <ul className="signs">
          <li>
            <strong>High-pitched squeal</strong> when braking: a little metal tab telling you the pads are getting thin. Book a check.
          </li>
          <li>
            <strong>Grinding or growling</strong>: metal on metal. Get it looked at right away.
          </li>
          <li>
            <strong>Soft or spongy pedal</strong>, or it sinks toward the floor: air or a leak in the fluid. Don’t drive it far.
          </li>
          <li>
            <strong>Car pulls to one side</strong> when you brake, or the pedal shudders: uneven pads or discs.
          </li>
        </ul>
        <p>Pads usually last 30,000 to 70,000 miles (50,000 to 110,000 km), depending on how and where you drive.</p>
      </Block>
    </LessonShell>
  )
}

function Hydraulics({ on }: { on: number }) {
  const bar = Math.round(on * 80)
  return (
    <svg viewBox="0 0 380 170" className={`hyd ${on > 0.3 ? 'is-flowing' : ''}`} role="img" aria-label={`Brake system diagram, line pressure about ${bar} bar`} style={{ '--on': on } as CSSProperties}>
      {/* pedal */}
      <g transform={`rotate(${on * 14} 34 30)`}>
        <line x1="34" y1="30" x2="34" y2="120" stroke="#bba9c6" strokeWidth="5" strokeLinecap="round" />
        <rect x="18" y="116" width="32" height="12" rx="4" fill="#bba9c6" />
      </g>
      <line x1="34" y1="62" x2={84 + on * 8} y2="62" stroke="#7f6d8c" strokeWidth="3" />
      {/* booster + master cylinder */}
      <circle cx="104" cy="62" r="22" fill="#2a2230" stroke="#5a4a66" />
      <rect x="126" y="52" width="58" height="20" rx="5" fill="#2a2230" stroke="#5a4a66" />
      <rect x="140" y="36" width="26" height="16" rx="3" fill="#ffb547" opacity="0.7" />
      {/* lines to wheels */}
      <path className="hyd__line" d="M184 58 H 300 V 26" />
      <path className="hyd__line" d="M184 66 H 300 V 140" />
      <path className="hyd__line" d="M240 58 V 26 H 250" />
      <path className="hyd__line" d="M240 66 V 140 H 250" />
      {[
        [300, 22],
        [300, 144],
        [258, 22],
        [258, 144],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-6" y="-12" width="22" height="24" rx="5" fill="#ff3d9a" opacity={0.55 + on * 0.45} />
        </g>
      ))}
      <text x="104" y="104" fill="#7f6d8c" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
        booster
      </text>
      <text x="155" y="90" fill="#7f6d8c" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
        master cyl.
      </text>
      <text x="350" y="88" fill="#ffb547" fontSize="13" fontFamily="JetBrains Mono" textAnchor="middle" fontWeight="600">
        {bar} bar
      </text>
      <text x="350" y="104" fill="#7f6d8c" fontSize="9.5" fontFamily="JetBrains Mono" textAnchor="middle">
        line pressure
      </text>
    </svg>
  )
}
