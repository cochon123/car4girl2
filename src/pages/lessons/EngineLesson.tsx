import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Link } from 'react-router'
import * as THREE from 'three'
import { Block, Callout, CameraRig, LessonCanvas, LessonShell, type View } from '../../components/LessonShell'
import { materialsNamed, node, rest, useModel } from '../../lib/models'
import { NodeLabel } from '../../three/NodeLabel'
import { SoftShadow } from '../../three/Studio'
import './engine.css'

// Kinematics from docs/asset-contract.md (+ assets-src/engine/manifest.json)
const R = 0.043
const L = 0.14
const LIFT = 0.009
const BORE = 0.086

const STROKES = [
  {
    key: 'intake',
    n: 1,
    name: 'Intake',
    nick: 'breathe in',
    color: '#7cc8ff',
    text: 'The piston slides down and the blue intake valve opens. Air, mixed with a fine mist of fuel, gets pulled in, like drawing back a syringe.',
  },
  {
    key: 'compression',
    n: 2,
    name: 'Compression',
    nick: 'squeeze',
    color: '#a98bff',
    text: 'Both valves shut. The piston rises and squeezes the mix into about a tenth of the space. Squeezed fuel burns much harder.',
  },
  {
    key: 'power',
    n: 3,
    name: 'Power',
    nick: 'bang',
    color: '#ffb547',
    text: 'The spark plug fires. The mix burns in a flash and the pressure shoves the piston down hard. This is the only stroke that makes power.',
  },
  {
    key: 'exhaust',
    n: 4,
    name: 'Exhaust',
    nick: 'breathe out',
    color: '#ff86c4',
    text: 'The orange exhaust valve opens and the piston pushes the burnt gas out toward the tailpipe. Then the whole thing starts again.',
  },
] as const

type Sim = { theta: number; playing: boolean; speed: number }

const strokeAt = (deg: number) => Math.min(3, Math.floor((((deg % 720) + 720) % 720) / 180))

const VIEWS: Record<string, View> = {
  overview: [0.62, 0.2, 0.28, 0, 0.1, 0],
  close: [0.42, 0.24, 0.12, 0, 0.17, 0],
}

function EngineModel({ sim, onStroke, labels }: { sim: RefObject<Sim>; onStroke: (i: number) => void; labels: boolean }) {
  const { root } = useModel('engine')
  const rig = useMemo(() => {
    const get = (n: string) => node(root, n)
    const crank = get('Crank')
    const rod = get('ConRod')
    const piston = get('Piston')
    const iv = get('IntakeValve')
    const ev = get('ExhaustValve')
    const icam = get('IntakeCam')
    const ecam = get('ExhaustCam')
    const fly = get('Flywheel')
    const tip = get('SparkTip') ?? get('SparkPlug')
    for (const o of [crank, rod, piston, iv, ev, icam, ecam, fly]) if (o) rest(o)

    materialsNamed(root, 'ValveIntake').forEach((m) => {
      m.color.set('#5aa8ff')
      m.emissive.set('#1d5fd0')
      m.emissiveIntensity = 0.35
    })
    materialsNamed(root, 'ValveExhaust').forEach((m) => {
      m.color.set('#ff9a3d')
      m.emissive.set('#c2410c')
      m.emissiveIntensity = 0.35
    })

    // tint the ports so you can see which way the gas flows
    const tintPort = (name: string) => {
      const o = get(name)
      const mats: THREE.MeshStandardMaterial[] = []
      o?.traverse((c) => {
        const mesh = c as THREE.Mesh
        if (mesh.isMesh) {
          const m = (mesh.material as THREE.MeshStandardMaterial).clone()
          mesh.material = m
          mats.push(m)
        }
      })
      return mats
    }
    const intakePort = tintPort('IntakePort')
    const exhaustPort = tintPort('ExhaustPort')

    // valve opening directions = node's local -Y expressed in the parent frame
    const dirOf = (o: THREE.Object3D | null) => (o ? new THREE.Vector3(0, -1, 0).applyQuaternion(rest(o).q) : new THREE.Vector3())

    return { crank, rod, piston, iv, ev, icam, ecam, fly, tip, ivDir: dirOf(iv), evDir: dirOf(ev), intakePort, exhaustPort }
  }, [root])

  const gasMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7cc8ff', emissive: '#7cc8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, roughness: 1 }),
    [],
  )
  const gas = useRef<THREE.Mesh>(null)
  const spark = useRef<THREE.PointLight>(null)
  const sparkGlow = useRef<THREE.Mesh>(null)
  const lastStroke = useRef(-1)
  const crownOffset = 0.03
  const deckY = useRef<number | null>(null)
  const col = useMemo(() => new THREE.Color(), [])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const qx = useMemo(() => new THREE.Quaternion(), [])
  const X = useMemo(() => new THREE.Vector3(1, 0, 0), [])

  // find the head deck: from the manifest constant if present on the node, else estimate from geometry
  useEffect(() => {
    const extras = (root.getObjectByName('Head')?.userData ?? {}) as { deckY?: number }
    deckY.current = extras.deckY ?? R + L + crownOffset + 0.009
  }, [root])

  useFrame((_, dt) => {
    const s = sim.current
    if (s.playing) s.theta = (s.theta + dt * s.speed) % 720
    const deg = s.theta
    const th = THREE.MathUtils.degToRad(deg)
    const yW = R * Math.cos(th) + Math.sqrt(L * L - (R * Math.sin(th)) ** 2)
    const dy = yW - (R + L)
    const phi = -Math.asin((R * Math.sin(th)) / L)

    const { crank, rod, piston, iv, ev, icam, ecam, fly } = rig
    if (crank) crank.quaternion.copy(rest(crank).q).multiply(qx.setFromAxisAngle(X, th))
    if (fly) fly.quaternion.copy(rest(fly).q).multiply(qx.setFromAxisAngle(X, th))
    if (piston) piston.position.copy(rest(piston).p).setY(rest(piston).p.y + dy)
    if (rod) {
      rod.position.copy(rest(rod).p).setY(rest(rod).p.y + dy)
      rod.quaternion.copy(rest(rod).q).multiply(qx.setFromAxisAngle(X, phi))
    }
    const m = ((deg % 720) + 720) % 720
    const liftIn = m < 180 ? Math.sin((Math.PI * m) / 180) ** 0.8 * LIFT : 0
    const liftEx = m >= 540 ? Math.sin((Math.PI * (m - 540)) / 180) ** 0.8 * LIFT : 0
    if (iv) iv.position.copy(rest(iv).p).addScaledVector(rig.ivDir, liftIn)
    if (ev) ev.position.copy(rest(ev).p).addScaledVector(rig.evDir, liftEx)
    if (icam) icam.quaternion.copy(rest(icam).q).multiply(qx.setFromAxisAngle(X, th / 2))
    if (ecam) ecam.quaternion.copy(rest(ecam).q).multiply(qx.setFromAxisAngle(X, th / 2))

    // gas column between piston crown and head deck
    const crown = yW + crownOffset
    const top = deckY.current ?? crown + 0.05
    const h = Math.max(0.001, top - crown)
    if (gas.current) {
      gas.current.scale.set(1, h, 1)
      gas.current.position.set(0, crown + h / 2, 0)
    }
    const st = strokeAt(m)
    const local = (m % 180) / 180
    if (st === 0) {
      col.set('#7cc8ff')
      gasMat.opacity = 0.18 + local * 0.22
    } else if (st === 1) {
      col.set('#7cc8ff').lerp(tmpColor.set('#b18cff'), local)
      gasMat.opacity = 0.4 + local * 0.3
    } else if (st === 2) {
      col.set('#fff2b0').lerp(tmpColor.set('#ff5a1f'), Math.min(1, local * 1.6))
      gasMat.opacity = 0.85 - local * 0.45
    } else {
      col.set('#8f7b86')
      gasMat.opacity = 0.38 - local * 0.3
    }
    gasMat.color.copy(col)
    gasMat.emissive.copy(col)
    gasMat.emissiveIntensity = st === 2 ? 2.2 - local * 1.6 : 0.5

    // spark right at the top of the compression stroke
    const sparkOn = m > 352 && m < 372 ? 1 - Math.abs(m - 362) / 10 : 0
    if (rig.tip) rig.tip.getWorldPosition(tmp)
    if (spark.current) {
      spark.current.position.copy(tmp)
      spark.current.intensity = sparkOn * 2.5
    }
    if (sparkGlow.current) {
      sparkGlow.current.position.copy(tmp)
      sparkGlow.current.scale.setScalar(0.004 + sparkOn * 0.012)
      sparkGlow.current.visible = sparkOn > 0
    }

    // ports glow while their valve is open
    rig.intakePort.forEach((p) => {
      p.emissive.set('#3d8bff')
      p.emissiveIntensity = (liftIn / LIFT) * 0.9
    })
    rig.exhaustPort.forEach((p) => {
      p.emissive.set('#ff6a1f')
      p.emissiveIntensity = (liftEx / LIFT) * 0.9
    })

    if (st !== lastStroke.current) {
      lastStroke.current = st
      onStroke(st)
    }
  })

  const g = (n: string) => node(root, n)
  return (
    <>
      <primitive object={root} />
      <mesh ref={gas} material={gasMat} renderOrder={2}>
        {/* half column on the cut side's far half so it sits inside the cutaway */}
        <cylinderGeometry args={[BORE / 2 - 0.0012, BORE / 2 - 0.0012, 1, 48, 1, false, Math.PI, Math.PI]} />
      </mesh>
      <pointLight ref={spark} color="#cfe3ff" intensity={0} distance={0.4} decay={2} />
      <mesh ref={sparkGlow} visible={false}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={new THREE.Color('#e6f0ff').multiplyScalar(3)} toneMapped={false} />
      </mesh>
      <SoftShadow y={-0.12} scale={1.2} opacity={0.6} />
      {labels && (
        <>
          <NodeLabel obj={g('HS_Piston')} label="Piston" sub="slides up & down" />
          <NodeLabel obj={g('HS_ConRod')} label="Connecting rod" sub="the 'leg'" />
          <NodeLabel obj={g('HS_Crank')} label="Crankshaft" sub="the 'pedals'" />
          <NodeLabel obj={g('HS_IntakeValve')} label="Intake valve" sub="lets air in" side="left" color="#7cc8ff" />
          <NodeLabel obj={g('HS_ExhaustValve')} label="Exhaust valve" sub="lets gas out" color="#ff9a3d" />
          <NodeLabel obj={g('HS_SparkPlug')} label="Spark plug" sub="the lighter" />
        </>
      )}
    </>
  )
}

const tmpColor = new THREE.Color()

export default function EngineLesson() {
  const sim = useRef<Sim>({ theta: 30, playing: true, speed: 70 })
  const [stroke, setStroke] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<'slow' | 'fast'>('slow')
  const [labels, setLabels] = useState(true)
  const [view, setView] = useState<View>(VIEWS.overview)
  const [theta, setTheta] = useState(30)

  // keep the scrubber in sync while playing (10 Hz is plenty)
  useEffect(() => {
    const id = window.setInterval(() => setTheta(Math.round(sim.current.theta)), 100)
    return () => window.clearInterval(id)
  }, [])

  const jump = (i: number) => {
    sim.current.theta = i * 180 + 90
    sim.current.playing = false
    setPlaying(false)
    setTheta(i * 180 + 90)
    setView(VIEWS.close)
  }

  const s = STROKES[stroke]
  return (
    <LessonShell
      slug="engine"
      stage={
        <LessonCanvas fov={32}>
          <CameraRig view={view} minDistance={0.18} maxDistance={1.6} />
          <EngineModel sim={sim} onStroke={setStroke} labels={labels} />
        </LessonCanvas>
      }
      stageOverlay={
        <>
          <div className="stage-hud">
            <div className="stroke-badge" style={{ '--c': s.color } as CSSProperties} aria-live="polite">
              <span className="mono">Stroke {s.n} of 4</span>
              <strong>{s.name}</strong>
              <em>“{s.nick}”</em>
            </div>
          </div>
          <div className="stage-bar glass">
            <button
              className="btn btn--candy btn--small"
              onClick={() => {
                sim.current.playing = !sim.current.playing
                setPlaying(sim.current.playing)
              }}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <input
              className="range"
              type="range"
              min={0}
              max={719}
              value={theta}
              aria-label="Crank angle"
              style={{ '--fill': `${(theta / 720) * 100}%` } as CSSProperties}
              onChange={(e) => {
                sim.current.theta = Number(e.target.value)
                sim.current.playing = false
                setPlaying(false)
                setTheta(Number(e.target.value))
              }}
            />
            <span className="mono crank-deg">{theta}°</span>
            <div className="seg" role="group" aria-label="Speed">
              {(['slow', 'fast'] as const).map((k) => (
                <button
                  key={k}
                  aria-pressed={speed === k}
                  onClick={() => {
                    setSpeed(k)
                    sim.current.speed = k === 'slow' ? 70 : 900
                    sim.current.playing = true
                    setPlaying(true)
                  }}
                >
                  {k === 'slow' ? 'Slow-mo' : 'Faster'}
                </button>
              ))}
            </div>
          </div>
        </>
      }
    >
      <Block>
        <p>
          Your engine is basically an <strong>air pump that sets tiny fires on purpose</strong>. This is one cylinder, cut in half so you can see inside. Most cars have four of
          them, all doing the same four moves on repeat.
        </p>
      </Block>

      <Block title="The four strokes" kicker="Tap one to freeze it">
        <ol className="steps">
          {STROKES.map((x, i) => (
            <li key={x.key}>
              <button aria-current={stroke === i ? 'step' : undefined} onClick={() => jump(i)} style={{ '--accent': x.color } as CSSProperties}>
                <span className="n">{x.n}</span>
                <span className="t">
                  {x.name} <span className="nick">· {x.nick}</span>
                </span>
                <span className="d">{x.text}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="row-btns">
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              sim.current.playing = true
              setPlaying(true)
              setView(VIEWS.overview)
            }}
          >
            ▶ Play the whole cycle
          </button>
          <button className="btn btn--ghost btn--small" onClick={() => setLabels((v) => !v)}>
            {labels ? 'Hide labels' : 'Show labels'}
          </button>
        </div>
      </Block>

      <Block title="Up-and-down becomes round-and-round">
        <p>
          The piston only moves up and down. The <strong>connecting rod</strong> and <strong>crankshaft</strong> turn that into spinning, exactly like your legs turning bike
          pedals. The spinning crank eventually turns your wheels.
        </p>
      </Block>

      <Block title="So what is RPM?">
        <p>
          One full turn of the crank is one <strong>revolution</strong>. The four strokes take two turns. When the rev counter points at 3, the crank is spinning{' '}
          <strong>3,000 times a minute</strong>. At a relaxed 2,500 rpm, each cylinder runs the whole cycle about 20 times every second.
        </p>
      </Block>

      <Callout tone="tip">
        <strong>Why your engine needs oil and coolant:</strong> oil lets the piston glide inside the cylinder without welding itself to the wall, and coolant carries away the
        heat from all those little explosions. You can check both yourself in <Link to="/learn/under-the-hood">the 5-minute hood check</Link>.
      </Callout>

      <Callout tone="tip">
        <strong>Electric cars skip all of this.</strong> An electric motor spins using magnets: no intake, no spark, no exhaust, and it is quiet because nothing is exploding.
      </Callout>
    </LessonShell>
  )
}
