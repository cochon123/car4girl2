import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { Block, Callout, CameraRig, LessonCanvas, LessonShell, type View } from '../../components/LessonShell'
import { damp, materialsNamed, node, useModel } from '../../lib/models'
import { NodeLabel } from '../../three/NodeLabel'
import { SoftShadow } from '../../three/Studio'
import './tires.css'

type CodeId = 'width' | 'ratio' | 'r' | 'rim' | 'load' | 'speed' | 'dot' | 'tread'

const CODE: { id: CodeId; code: string; hs: string; title: string; text: string }[] = [
  { id: 'width', code: '205', hs: 'HS_Width', title: 'Width: 205 mm', text: 'How wide the tire is from sidewall to sidewall, in millimetres. About the length of a phone.' },
  {
    id: 'ratio',
    code: '/55',
    hs: 'HS_AspectRatio',
    title: 'Profile: 55%',
    text: 'The sidewall is 55% as tall as the tire is wide, so 113 mm here. Lower numbers mean thinner, sportier sidewalls and a firmer ride.',
  },
  { id: 'r', code: 'R', hs: 'HS_AspectRatio', title: 'R for radial', text: 'How it is built inside: the layers of cord run radially across the tire. Almost every car tire made today is an R.' },
  { id: 'rim', code: '16', hs: 'HS_RimSize', title: 'Rim: 16 inches', text: 'It fits a wheel 16 inches across. Yes, a metric width and an imperial rim on the same tire. Cars are weird.' },
  { id: 'load', code: '91', hs: 'HS_LoadSpeed', title: 'Load index 91', text: 'Each tire can safely carry up to 615 kg (1,356 lb). Replacement tires should have the same number or higher.' },
  { id: 'speed', code: 'V', hs: 'HS_LoadSpeed', title: 'Speed rating V', text: 'Rated for sustained speeds up to 240 km/h (149 mph). That is a safety margin, not a dare.' },
  {
    id: 'dot',
    code: 'DOT 4524',
    hs: 'HS_DOT',
    title: 'Born: week 45 of 2024',
    text: 'The last four digits of the DOT code are the week and year it was made. Rubber ages even in a garage: most makers say replace after 6 to 10 years, whatever the tread.',
  },
]

function WheelModel({ active, onViews }: { active: CodeId | null; onViews: (v: Record<string, View>) => void }) {
  const { root } = useModel('wheel')
  const rig = useMemo(() => {
    const text = materialsNamed(root, 'RubberText')
    text.forEach((m) => (m.userData.c0 = m.color.clone()))
    for (const m of materialsNamed(root, 'BrakeCaliper')) m.color.set('#ff3d9a')
    return { text, spin: node(root, 'Spin') }
  }, [root])

  useEffect(() => {
    root.updateMatrixWorld(true)
    const views: Record<string, View> = { overview: [1.25, 0.28, 0.5, 0, 0, 0], tread: [0.45, 0.25, 0.75, 0, 0.2, 0.1] }
    for (const c of CODE) {
      const hs = node(root, c.hs)
      if (!hs) continue
      const p = hs.getWorldPosition(new THREE.Vector3())
      views[c.id] = [p.x + 0.55, p.y * 0.85 + 0.05, p.z * 0.85 + 0.12, p.x * 0.2, p.y * 0.8, p.z * 0.8]
    }
    const tr = node(root, 'HS_Tread')
    if (tr) {
      const p = tr.getWorldPosition(new THREE.Vector3())
      views.tread = [p.x + 0.35, p.y + 0.35, p.z + 0.45, p.x, p.y, p.z]
    }
    onViews(views)
  }, [root, onViews])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const glow = active && active !== 'tread' ? 0.6 + 0.4 * Math.sin(t * 4) : 0
    rig.text.forEach((m) => {
      m.emissive.set('#ff3d9a')
      m.emissiveIntensity = damp(m.emissiveIntensity, glow * 0.9, 6, dt)
    })
    if (rig.spin && active === 'tread') rig.spin.rotation.x += dt * 0.25
  })

  const current = CODE.find((c) => c.id === active)
  return (
    <>
      <primitive object={root} />
      <SoftShadow y={-0.318} scale={2} opacity={0.7} />
      {current && <NodeLabel obj={node(root, current.hs)} label={current.code} sub={current.title} active />}
      {active === 'tread' && (
        <>
          <NodeLabel obj={node(root, 'HS_Tread')} label="Tread" sub="grooves push water away" active />
          <NodeLabel obj={node(root, 'HS_TreadWearBar')} label="Wear bar" sub="flush = worn out" side="left" color="#ffb547" />
        </>
      )}
      {!active && <NodeLabel obj={node(root, 'HS_ValveStem')} label="Valve" sub="where the air goes in" color="#7cc8ff" />}
    </>
  )
}

export default function TiresLesson() {
  const [active, setActive] = useState<CodeId | null>(null)
  const [views, setViews] = useState<Record<string, View> | null>(null)
  const [depth, setDepth] = useState(6)
  const [psi, setPsi] = useState(33)
  const view = views ? (active ? (views[active] ?? views.overview) : views.overview) : null
  const cur = CODE.find((c) => c.id === active)

  return (
    <LessonShell
      slug="tires"
      stage={
        <LessonCanvas fov={34}>
          {view && <CameraRig view={view} minDistance={0.25} maxDistance={3} />}
          <WheelModel active={active} onViews={setViews} />
        </LessonCanvas>
      }
      stageOverlay={
        <div className="sidewall-bar glass" role="group" aria-label="Sidewall code">
          {CODE.map((c) => (
            <button key={c.id} className={`code ${active === c.id ? 'is-on' : ''}`} onClick={() => setActive(active === c.id ? null : c.id)} aria-pressed={active === c.id}>
              {c.code}
            </button>
          ))}
        </div>
      }
    >
      <Block>
        <p>
          Your tires are the only part of the car that actually touches the road: four patches of rubber, each <strong>about the size of your hand</strong>. Worth knowing a
          little about.
        </p>
      </Block>

      <Block title="Decode the sidewall" kicker="Tap each piece of the code">
        <div className="codebox" aria-live="polite">
          <div className="codebox__code mono">
            {CODE.slice(0, 6).map((c) => (
              <button key={c.id} className={active === c.id ? 'is-on' : ''} onClick={() => setActive(c.id)}>
                {c.code}
              </button>
            ))}
          </div>
          {cur ? (
            <div className="codebox__explain">
              <strong>{cur.title}</strong>
              <p>{cur.text}</p>
            </div>
          ) : (
            <p className="codebox__explain">Every tire has a code like this moulded into its side. Tap a piece above (or in the bar on the 3D view).</p>
          )}
        </div>
        <button className={`btn btn--ghost btn--small ${active === 'dot' ? 'is-on' : ''}`} onClick={() => setActive('dot')}>
          How old is this tire?
        </button>
      </Block>

      <Block title="Tread depth: the coin test" kicker="Drag to wear the tire down">
        <TreadWidget depth={depth} />
        <input
          className="range"
          type="range"
          min={1}
          max={8}
          step={0.1}
          value={9 - depth}
          aria-label="Tread wear"
          style={{ '--fill': `${((8 - depth) / 7) * 100}%` } as CSSProperties}
          onChange={(e) => setDepth(9 - Number(e.target.value))}
        />
        <TreadVerdict depth={depth} />
        <p>
          Slide a coin into a groove. In the US, put a penny in head-first: if you can see the <strong>top of Lincoln’s head</strong>, you are under 2/32″ (1.6 mm). Tires also
          have little <strong>wear bars</strong> moulded into the grooves: when the tread is flush with them, it’s time.
        </p>
        <button className="btn btn--ghost btn--small" onClick={() => setActive('tread')}>
          Show me the wear bars in 3D
        </button>
      </Block>

      <Block title="Pressure: not the number on the tire" kicker="Drag to inflate">
        <PressureWidget psi={psi} />
        <input
          className="range"
          type="range"
          min={20}
          max={46}
          step={1}
          value={psi}
          aria-label="Tire pressure in psi"
          style={{ '--fill': `${((psi - 20) / 26) * 100}%` } as CSSProperties}
          onChange={(e) => setPsi(Number(e.target.value))}
        />
        <p>
          The right pressure for your car is on a <strong>sticker inside the driver’s door frame</strong> (or in the manual), here 33 psi / 2.3 bar. The number moulded on the tire
          is its maximum, not the target. Check monthly with the tires cold: they lose about 1 psi a month on their own, and more when it gets cold outside.
        </p>
      </Block>

      <Callout tone="warn">
        <strong>Bulges, cracks or a nail?</strong> A bubble on the sidewall means the tire’s structure is damaged and could fail: replace it, don’t patch it. A nail in the main
        tread can often be repaired cheaply.
      </Callout>
    </LessonShell>
  )
}

function TreadVerdict({ depth }: { depth: number }) {
  const in32 = Math.round((depth / 25.4) * 32)
  const [tone, text] =
    depth >= 4
      ? ['ok', 'Plenty of tread. Great grip, wet or dry.']
      : depth >= 3
        ? ['mid', 'Still legal, but wet grip is dropping. Start shopping.']
        : depth >= 1.6
          ? ['low', 'Replace soon: stopping distances in the rain get much longer.']
          : ['bad', 'Below 1.6 mm: illegal in many places. Replace now.']
  return (
    <p className={`verdict verdict--${tone}`}>
      <span className="mono">
        {depth.toFixed(1)} mm · {in32}/32″
      </span>
      {text}
    </p>
  )
}

function TreadWidget({ depth }: { depth: number }) {
  // Looking along a groove: tire carcass on top, the tread band in front, a coin pushed head-first into the groove.
  // The top of the head sits 1.6 mm from the coin's edge, so it shows below the tread once the tread is thinner than that.
  const S = 11 // px per mm
  const base = 26
  const surface = base + depth * S
  const R = 9.5 * S
  const cx = 190
  const headTop = base + 1.6 * S
  const visible = depth < 1.6
  return (
    <svg viewBox="0 0 380 200" className="tread-svg" role="img" aria-label={`Tread ${depth.toFixed(1)} millimetres deep: the coin's head is ${visible ? 'visible, replace the tire' : 'covered'}`}>
      <defs>
        <linearGradient id="coin" x1="0" x2="1">
          <stop offset="0" stopColor="#b8703f" />
          <stop offset="1" stopColor="#e9a06d" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="380" height={base} fill="#2a2230" />
      <circle cx={cx} cy={base + R} r={R} fill="url(#coin)" />
      <circle cx={cx} cy={base + R} r={R - 8} fill="none" stroke="#a8613a" strokeWidth="2" />
      <path d={`M ${cx - 16} ${headTop + 40} C ${cx - 22} ${headTop + 10}, ${cx - 8} ${headTop}, ${cx + 2} ${headTop} C ${cx + 18} ${headTop}, ${cx + 22} ${headTop + 18}, ${cx + 14} ${headTop + 40} Z`} fill="#9a5630" />
      <rect x="0" y={base} width="380" height={depth * S} fill="#3b3043" opacity="0.93" />
      {[70, 150, 230, 310].map((x) => (
        <rect key={x} x={x} y={base} width="6" height={depth * S} fill="#241b2b" />
      ))}
      <line x1="0" x2="380" y1={surface} y2={surface} stroke="#bba9c6" strokeWidth="1.5" />
      <line x1={cx - 60} x2={cx + 60} y1={headTop} y2={headTop} stroke={visible ? '#ff4d5e' : '#e8cdb9'} strokeDasharray="4 4" />
      <text x={cx + 66} y={headTop + 4} fill={visible ? '#ff4d5e' : '#d9c4b8'} fontSize="11" fontFamily="JetBrains Mono">
        {visible ? 'head visible!' : 'top of the head'}
      </text>
      <text x="12" y="18" fill="#bba9c6" fontSize="11" fontFamily="JetBrains Mono">
        tire
      </text>
      <text x="12" y={Math.max(base + 13, surface - 6)} fill="#bba9c6" fontSize="11" fontFamily="JetBrains Mono">
        tread
      </text>
      <text x="12" y={surface + 16} fill="#7f6d8c" fontSize="11" fontFamily="JetBrains Mono">
        tread surface
      </text>
    </svg>
  )
}

function PressureWidget({ psi }: { psi: number }) {
  const target = 33
  const k = target / psi // >1 under-inflated
  const w = 150 * Math.min(1.25, Math.max(0.75, Math.pow(k, 0.45)))
  const h = 92 * Math.min(1.5, Math.max(0.7, Math.pow(k, 0.9)))
  const flat = 16 * Math.min(2.2, Math.max(0.25, Math.pow(k, 2.5)))
  const state = psi < 29 ? 'under' : psi > 38 ? 'over' : 'ok'
  return (
    <div className="pressure">
      <svg viewBox="0 0 360 170" role="img" aria-label={`Tire at ${psi} psi: ${state === 'ok' ? 'correct' : state === 'under' ? 'under-inflated' : 'over-inflated'}`}>
        {/* side view */}
        <g transform="translate(90 84)">
          <path
            d={`M ${-62} ${0} A 62 62 0 1 1 62 0 L ${62 - flat * 0.25} ${62 - flat * 0.2} Q 0 ${62 - flat * 0.7} ${-62 + flat * 0.25} ${62 - flat * 0.2} Z`}
            fill="#2a2230"
            stroke="#5a4a66"
            strokeWidth="2"
            transform={`scale(${1 + (k - 1) * 0.05} 1)`}
          />
          <circle r="34" fill="#9a90a6" />
          <circle r="12" fill="#3b3043" />
          <line x1="-80" x2="80" y1="64" y2="64" stroke="#7f6d8c" />
          <text x="0" y="82" fill="#7f6d8c" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            side view
          </text>
        </g>
        {/* contact patch, seen from below */}
        <g transform="translate(268 76)">
          <rect x={-w / 2.6} y={-h / 2} width={w / 1.3} height={h} rx="18" fill="#3b3043" />
          {state === 'under' && (
            <>
              <rect x={-w / 2.6} y={-h / 2} width={14} height={h} rx="7" fill="#ff4d5e" opacity="0.8" />
              <rect x={w / 2.6 - 14} y={-h / 2} width={14} height={h} rx="7" fill="#ff4d5e" opacity="0.8" />
            </>
          )}
          {state === 'over' && <rect x={-12} y={-h / 2} width={24} height={h} rx="10" fill="#ffb547" opacity="0.85" />}
          {state === 'ok' && <rect x={-w / 2.6} y={-h / 2} width={w / 1.3} height={h} rx="18" fill="none" stroke="#4ee38f" strokeWidth="2" />}
          <text x="0" y={h / 2 + 22} fill="#7f6d8c" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
            footprint
          </text>
        </g>
      </svg>
      <p className={`verdict verdict--${state === 'ok' ? 'ok' : 'low'}`}>
        <span className="mono">
          {psi} psi · {(psi * 0.0689476).toFixed(1)} bar
        </span>
        {state === 'ok'
          ? 'Spot on. Even wear, best grip, best fuel economy.'
          : state === 'under'
            ? 'Too soft: the edges wear out, it handles like a marshmallow and it burns more fuel.'
            : 'Too hard: only the middle touches the road. Less grip, bumpier ride.'}
      </p>
    </div>
  )
}
