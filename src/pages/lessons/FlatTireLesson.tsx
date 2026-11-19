import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import { Block, Callout, CameraRig, LessonCanvas, LessonShell, type View } from '../../components/LessonShell'
import { damp, materialsNamed, node, replaceMaterial, rest, useModel } from '../../lib/models'
import { makePaintMaterial, PAINTS } from '../../lib/paint'
import { NodeLabel } from '../../three/NodeLabel'
import { ReflectiveFloor, SoftShadow } from '../../three/Studio'
import './flat.css'

type Step = {
  title: string
  text: string
  scene: 'car' | 'wheel'
  view: string
  hazards?: boolean
  hatch?: boolean
  jack?: boolean
  lifted?: boolean
  wheelOff?: boolean
}

const STEPS: Step[] = [
  {
    title: 'Get somewhere safe',
    text: 'Pull as far off the road as you can, on flat, firm ground. Hazards on, parking brake on, everyone out on the side away from traffic. If it feels unsafe, stay put and call for help: that is what roadside assistance is for.',
    scene: 'car',
    view: 'car34',
    hazards: true,
  },
  {
    title: 'Grab your kit',
    text: 'The spare, the jack and the lug wrench usually live under the trunk floor. Some cars have a repair kit (sealant + pump) instead of a spare. Wheel wedges or a big rock behind the opposite wheel stop rolling.',
    scene: 'car',
    view: 'rear',
    hatch: true,
    hazards: true,
  },
  {
    title: 'Loosen the nuts first',
    text: 'With the car still on the ground (so the wheel can’t spin), turn each nut about half a turn anticlockwise. Lefty-loosey. If one is stubborn, stand on the wrench handle: your legs are stronger than your arms.',
    scene: 'car',
    view: 'wheelFL',
    hazards: true,
  },
  {
    title: 'Jack it up',
    text: 'Find the jacking point: a reinforced notch or flat spot on the sill just behind the front wheel (your manual has a picture). Wind the jack up until the flat tire is a few centimetres off the ground. Never put any part of your body under the car.',
    scene: 'car',
    view: 'jack',
    hazards: true,
    jack: true,
    lifted: true,
  },
  {
    title: 'Swap the wheel',
    text: 'Unscrew the nuts the rest of the way and keep them somewhere they can’t roll (a hubcap works). Pull the wheel straight toward you, lift the spare onto the studs and screw the nuts on by hand.',
    scene: 'car',
    view: 'wheelFL',
    hazards: true,
    jack: true,
    lifted: true,
    wheelOff: true,
  },
  {
    title: 'Tighten in a star',
    text: 'Snug the nuts in a star pattern so the wheel sits perfectly flat, never round in a circle. Try it: tap the nuts in star order, starting from the top.',
    scene: 'wheel',
    view: 'nuts',
  },
  {
    title: 'Lower it and re-check',
    text: 'Lower the car, then tighten every nut firmly once more in the same star pattern. Check the spare’s pressure soon. A skinny “space-saver” spare is for getting you to a tire shop: usually max 80 km/h (50 mph) and not too far.',
    scene: 'car',
    view: 'car34',
  },
]

const STAR = [1, 3, 5, 2, 4]
const LIFT = 0.075

function ScissorJack({ base, top, visible }: { base: THREE.Vector3; top: RefObject<THREE.Vector3>; visible: boolean }) {
  const arms = useRef<(THREE.Mesh | null)[]>([])
  const saddle = useRef<THREE.Mesh>(null)
  const screw = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d6ff4f', metalness: 0.4, roughness: 0.35 }), [])
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b2433', metalness: 0.7, roughness: 0.4 }), [])
  const show = useRef(0)
  const l = 0.17
  useFrame((_, dt) => {
    show.current = damp(show.current, visible ? 1 : 0, 5, dt)
    if (!group.current) return
    group.current.visible = show.current > 0.01
    group.current.position.set(base.x, 0, base.z)
    group.current.scale.setScalar(0.4 + 0.6 * show.current)
    const h = Math.max(0.06, (top.current?.y ?? 0.2) - 0.03) * show.current + 0.06 * (1 - show.current)
    const half = Math.min(h / 2, l * 0.98)
    const w = Math.sqrt(l * l - half * half)
    const by = 0.03
    const pts = [
      [0, by],
      [w, by + half],
      [0, by + 2 * half],
      [-w, by + half],
    ]
    const seg = (i: number, a: number[], b: number[]) => {
      const m = arms.current[i]
      if (!m) return
      m.position.set(0, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2)
      m.rotation.set(Math.atan2(b[0] - a[0], b[1] - a[1]), 0, 0)
    }
    seg(0, pts[0], pts[1])
    seg(1, pts[1], pts[2])
    seg(2, pts[2], pts[3])
    seg(3, pts[3], pts[0])
    if (saddle.current) saddle.current.position.set(0, by + 2 * half + 0.012, 0)
    if (screw.current) screw.current.position.set(0, by + half, 0)
  })
  return (
    <group ref={group}>
      <mesh material={dark} position={[0, 0.012, 0]} castShadow>
        <boxGeometry args={[0.1, 0.024, 0.32]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            arms.current[i] = m
          }}
          material={mat}
          castShadow
        >
          <boxGeometry args={[0.06, l, 0.018]} />
        </mesh>
      ))}
      <mesh ref={saddle} material={dark} castShadow>
        <boxGeometry args={[0.07, 0.024, 0.12]} />
      </mesh>
      <mesh ref={screw} material={dark} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.008, 0.008, 0.42, 12]} />
      </mesh>
    </group>
  )
}

function CarScene({ step, onViews, visible }: { step: Step; onViews: (v: Record<string, View>) => void; visible: boolean }) {
  const { root } = useModel('car')
  const pivot = useRef<THREE.Group>(null)
  const jackTop = useRef(new THREE.Vector3(0, 0.2, 0))
  const paint = useMemo(() => makePaintMaterial(PAINTS.find((p) => p.id === 'lilac')!), [])
  const rig = useMemo(() => {
    replaceMaterial(root, 'CarPaint', paint)
    for (const m of materialsNamed(root, 'BrakeCaliper')) m.color.set('#ff3d9a')
    const lamps = [...materialsNamed(root, 'HeadlightEmissive'), ...materialsNamed(root, 'TaillightEmissive')]
    lamps.forEach((m) => (m.userData.c0 = m.emissive.clone()))
    const g = (n: string) => node(root, n)
    const wFL = g('Wheel_FL')
    const wFR = g('Wheel_FR')
    const wRL = g('Wheel_RL')
    const hatch = g('Hatch')
    for (const o of [wFL, wFR, wRL, hatch]) if (o) rest(o)
    const jackPoint = g('HS_JackPoint_FL')
    root.updateMatrixWorld(true)
    const jp = jackPoint ? jackPoint.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0.8, 0.2, 0.9)
    const fl = wFL ? wFL.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0.78, 0.31, 1.3)
    const xR = wFR ? wFR.getWorldPosition(new THREE.Vector3()).x : -fl.x
    return { lamps, wFL, wRL, hatch, jackPoint, jp, fl, xR, lift: 0, off: 0, hatchT: 0 }
  }, [root, paint])

  useEffect(() => {
    const { fl, jp } = rig
    onViews({
      car34: [4.6, 1.7, 5.2, 0, 0.55, 0],
      rear: [2.2, 1.8, -5.2, 0, 0.8, -1.1],
      wheelFL: [fl.x + 2.1, fl.y + 0.45, fl.z + 1.6, fl.x, fl.y, fl.z],
      jack: [jp.x + 1.7, 0.45, jp.z + 1.1, jp.x, 0.2, jp.z],
    })
  }, [rig, onViews])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    rig.lift = damp(rig.lift, step.lifted ? 1 : 0, 1.6, dt)
    rig.off = damp(rig.off, step.wheelOff ? 1 : 0, 2.2, dt)
    rig.hatchT = damp(rig.hatchT, step.hatch ? 1 : 0, 2.5, dt)

    // roll the body up on its left side around the right-hand wheels
    const span = rig.fl.x - rig.xR
    const ang = (LIFT * rig.lift) / span
    if (pivot.current) {
      pivot.current.position.set(rig.xR, 0, 0)
      pivot.current.rotation.z = ang
    }
    // the rear-left wheel stays on the ground (suspension droops), the front-left hangs and comes off
    if (rig.wRL) rig.wRL.position.copy(rest(rig.wRL).p).add({ x: 0, y: -LIFT * rig.lift, z: 0 } as THREE.Vector3)
    if (rig.wFL) {
      const r = rest(rig.wFL)
      rig.wFL.position.copy(r.p).add({ x: rig.off * 0.55, y: -0.03 * rig.lift, z: 0 } as THREE.Vector3)
      rig.wFL.rotation.x = rig.off * 0.6
    }
    if (rig.hatch) rig.hatch.quaternion.copy(rest(rig.hatch).q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rig.hatchT * 1.15))
    if (rig.jackPoint) rig.jackPoint.getWorldPosition(jackTop.current)

    const blink = step.hazards && Math.sin(t * Math.PI * 3) > 0
    rig.lamps.forEach((m) => {
      if (step.hazards) {
        m.emissive.set('#ff9d1f')
        m.emissiveIntensity = blink ? 3 : 0.05
      } else {
        m.emissive.copy(m.userData.c0 as THREE.Color)
        m.emissiveIntensity = 1.5
      }
    })
  })

  return (
    <group visible={visible}>
      <group ref={pivot}>
        <group position={[-rig.xR, 0, 0]}>
          <primitive object={root} />
        </group>
      </group>
      <ScissorJack base={rig.jp} top={jackTop} visible={!!step.jack && visible} />
      {visible && step.view === 'jack' && <NodeLabel obj={rig.jackPoint} label="Jacking point" sub="the reinforced notch" color="#d6ff4f" />}
      <ReflectiveFloor resolution={512} />
      <SoftShadow scale={9} />
    </group>
  )
}

function NutScene({ visible, order, wrong, onNut }: { visible: boolean; order: number[]; wrong: number | null; onNut: (n: number) => void }) {
  const { root } = useModel('wheel')
  const nuts = useMemo(() => {
    for (const m of materialsNamed(root, 'BrakeCaliper')) m.color.set('#ff3d9a')
    return [1, 2, 3, 4, 5].map((n) => {
      const o = node(root, `LugNut_${n}`)
      if (o) rest(o)
      const mats: THREE.MeshStandardMaterial[] = []
      o?.traverse((c) => {
        const mesh = c as THREE.Mesh
        if (mesh.isMesh) {
          const m = (mesh.material as THREE.MeshStandardMaterial).clone()
          mesh.material = m
          mats.push(m)
        }
      })
      return { n, o, mats, t: 0 }
    })
  }, [root])

  useFrame((state, dt) => {
    const time = state.clock.elapsedTime
    nuts.forEach((nut) => {
      if (!nut.o) return
      const done = order.includes(nut.n)
      nut.t = damp(nut.t, done ? 1 : 0, 6, dt)
      const r = rest(nut.o)
      const shake = wrong === nut.n ? Math.sin(time * 60) * 0.003 : 0
      nut.o.position.copy(r.p).add({ x: 0.018 * (1 - nut.t), y: shake, z: 0 } as THREE.Vector3)
      nut.o.quaternion.copy(r.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -nut.t * Math.PI * 2))
      const next = STAR[order.length] === nut.n
      nut.mats.forEach((m) => {
        if (done) {
          m.emissive.set('#4ee38f')
          m.emissiveIntensity = 0.55
        } else if (wrong === nut.n) {
          m.emissive.set('#ff4d5e')
          m.emissiveIntensity = 0.9
        } else if (next && order.length === 0) {
          m.emissive.set('#ff3d9a')
          m.emissiveIntensity = 0.35 + 0.35 * Math.sin(time * 5)
        } else {
          m.emissiveIntensity = 0
        }
      })
    })
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    let o: THREE.Object3D | null = e.object
    while (o) {
      const m = /^LugNut_(\d)$/.exec(o.name)
      if (m) {
        e.stopPropagation()
        onNut(Number(m[1]))
        return
      }
      o = o.parent
    }
  }

  return (
    <group visible={visible} position={[0, 0.32, 0]}>
      <primitive
        object={root}
        onClick={visible ? click : undefined}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => visible && /^LugNut_/.test(e.object.parent?.name ?? e.object.name) && (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      />
      {visible &&
        nuts.map((nut) => (
          <NodeLabel
            key={nut.n}
            obj={nut.o}
            offset={[0.03, 0, 0]}
            label={order.includes(nut.n) ? `✓ ${order.indexOf(nut.n) + 1}` : '?'}
            color={order.includes(nut.n) ? '#4ee38f' : '#ff86c4'}
            dim={!order.includes(nut.n)}
            onClick={() => onNut(nut.n)}
          />
        ))}
    </group>
  )
}

export default function FlatTireLesson() {
  const [i, setI] = useState(0)
  const [views, setViews] = useState<Record<string, View>>({})
  const [order, setOrder] = useState<number[]>([])
  const [wrong, setWrong] = useState<number | null>(null)
  const step = STEPS[i]
  const starDone = order.length === STAR.length

  const nutView: View = [1.05, 0.42, 0.32, 0, 0.32, 0]
  const view = step.scene === 'wheel' ? nutView : views[step.view]

  const onNut = (n: number) => {
    if (order.includes(n) || starDone) return
    if (STAR[order.length] === n) {
      setOrder((o) => [...o, n])
      setWrong(null)
    } else {
      setWrong(n)
      window.setTimeout(() => setWrong((w) => (w === n ? null : w)), 600)
    }
  }

  const go = (k: number) => {
    setI(k)
    if (STEPS[k].scene === 'wheel') {
      setOrder([])
      setWrong(null)
    }
  }

  return (
    <LessonShell
      slug="flat-tire"
      stage={
        <LessonCanvas fov={34}>
          {view && <CameraRig view={view} minDistance={0.3} maxDistance={12} />}
          <CarScene step={step} onViews={setViews} visible={step.scene === 'car'} />
          <NutScene visible={step.scene === 'wheel'} order={order} wrong={wrong} onNut={onNut} />
        </LessonCanvas>
      }
      stageOverlay={
        <div className="flat-bar glass">
          <button className="btn btn--ghost btn--small" disabled={i === 0} onClick={() => go(i - 1)}>
            ← Back
          </button>
          <span className="mono flat-bar__n">
            Step {i + 1} / {STEPS.length}
          </span>
          <button className="btn btn--candy btn--small" disabled={i === STEPS.length - 1 || (step.scene === 'wheel' && !starDone)} onClick={() => go(i + 1)}>
            Next →
          </button>
        </div>
      }
    >
      <Block>
        <p>
          A flat is annoying, not dangerous, as long as you’re somewhere safe. With a spare and 20 minutes you can do this yourself. Practise here first so the real thing feels
          familiar.
        </p>
      </Block>

      <ol className="steps">
        {STEPS.map((s, k) => (
          <li key={s.title}>
            <button aria-current={k === i ? 'step' : undefined} className={k < i ? 'is-done' : ''} onClick={() => go(k)}>
              <span className="n">{k < i ? '✓' : k + 1}</span>
              <span className="t">{s.title}</span>
              {k === i && <span className="d">{s.text}</span>}
            </button>
          </li>
        ))}
      </ol>

      {step.scene === 'wheel' && (
        <Block title="The star pattern" kicker={starDone ? 'Nailed it' : `Nut ${order.length + 1} of 5`}>
          <StarDiagram order={order} />
          <p aria-live="polite">
            {starDone
              ? 'Perfect star. Each nut pulls the wheel evenly against the hub, so it sits dead flat.'
              : wrong
                ? 'Not that one. Skip one nut each time, like drawing a star without lifting your pen.'
                : order.length === 0
                  ? 'Start with the glowing nut at the top.'
                  : 'Now skip one and go to the next.'}
          </p>
          {starDone && (
            <button className="btn btn--candy btn--small" onClick={() => go(i + 1)}>
              Lower the car →
            </button>
          )}
        </Block>
      )}

      <Callout tone="stop">
        <strong>The jack only holds the car up while you swap the wheel.</strong> Never crawl under a car on a jack, and don’t jack on soft ground or a slope.
      </Callout>
      <Callout tone="tip">
        <strong>No spare?</strong> Many new cars have a tire repair kit instead: a can of sealant and a small pump that plugs into the car. It fixes small punctures in the tread
        (not the sidewall) well enough to get you to a shop.
      </Callout>
    </LessonShell>
  )
}

function StarDiagram({ order }: { order: number[] }) {
  // nut 1 at 12 o'clock, numbered clockwise
  const pos = (n: number) => {
    const a = -Math.PI / 2 + ((n - 1) / 5) * Math.PI * 2
    return [60 + Math.cos(a) * 38, 60 + Math.sin(a) * 38]
  }
  const pts = order.map(pos)
  return (
    <svg viewBox="0 0 120 120" className="star-svg" role="img" aria-label={`Star pattern: ${order.length} of 5 nuts done`}>
      <circle cx="60" cy="60" r="52" fill="#19121f" stroke="rgba(255,255,255,0.12)" />
      <circle cx="60" cy="60" r="14" fill="#2a2230" />
      {pts.length > 1 && <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#4ee38f" strokeWidth="2.5" strokeLinejoin="round" />}
      {[1, 2, 3, 4, 5].map((n) => {
        const [x, y] = pos(n)
        const k = order.indexOf(n)
        return (
          <g key={n} style={{ '--d': k } as CSSProperties}>
            <circle cx={x} cy={y} r="9" fill={k >= 0 ? '#4ee38f' : '#3b3043'} />
            <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10" fontFamily="JetBrains Mono" fill={k >= 0 ? '#0d0812' : '#bba9c6'}>
              {k >= 0 ? k + 1 : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
