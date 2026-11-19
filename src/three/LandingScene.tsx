import { Suspense, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sparkles, Text } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useNavigate } from 'react-router'
import * as THREE from 'three'
import { IDLE_RPM, landing, REDLINE_RPM } from '../lib/landingState'
import { clamp, damp, easeInOutCubic, easeOutCubic, materialsNamed, node, replaceMaterial, rest, smooth, useModel } from '../lib/models'
import { lerpPaint, makePaintMaterial, PAINTS } from '../lib/paint'
import { Hotspot } from './Hotspot'
import { ReflectiveFloor, SoftShadow, StudioEnvironment } from './Studio'

type V3 = [number, number, number]

/** How each top-level car part flies out when the user scrolls through "take it apart". */
const PARTS: { name: string; off: V3; delay: number; spin?: V3; sprung?: boolean }[] = [
  { name: 'Wheel_FL', off: [1.3, 0, 0.35], delay: 0.0 },
  { name: 'Wheel_FR', off: [-1.3, 0, 0.35], delay: 0.02 },
  { name: 'Wheel_RL', off: [1.3, 0, -0.35], delay: 0.04 },
  { name: 'Wheel_RR', off: [-1.3, 0, -0.35], delay: 0.06 },
  { name: 'Door_FL', off: [1.1, 0.6, 0.15], delay: 0.1, spin: [0, -0.35, 0], sprung: true },
  { name: 'Door_RL', off: [1.1, 0.6, -0.25], delay: 0.12, spin: [0, -0.25, 0], sprung: true },
  { name: 'Door_FR', off: [-1.1, 0.6, 0.15], delay: 0.1, spin: [0, 0.35, 0], sprung: true },
  { name: 'Door_RR', off: [-1.1, 0.6, -0.25], delay: 0.12, spin: [0, 0.25, 0], sprung: true },
  { name: 'Hood', off: [0, 2.35, 0.75], delay: 0.16, spin: [-0.3, 0, 0], sprung: true },
  { name: 'Hatch', off: [0, 1.95, -1.25], delay: 0.18, spin: [0.35, 0, 0], sprung: true },
  { name: 'Body', off: [0, 1.65, 0], delay: 0.22, sprung: true },
  { name: 'Glass', off: [0, 2.0, 0], delay: 0.24, sprung: true },
  { name: 'Headlights', off: [0, 1.6, 1.1], delay: 0.26, sprung: true },
  { name: 'Taillights', off: [0, 1.6, -1.1], delay: 0.26, sprung: true },
  { name: 'Interior', off: [0, 0.62, -0.15], delay: 0.32, sprung: true },
  { name: 'Engine', off: [0, 0.6, 1.5], delay: 0.36, sprung: true },
  { name: 'Battery', off: [0.95, 0.9, 1.4], delay: 0.4, sprung: true },
  { name: 'Radiator', off: [0, 0.4, 2.35], delay: 0.42, sprung: true },
  { name: 'Exhaust', off: [-0.95, 0.12, -1.3], delay: 0.44 },
  { name: 'FuelTank', off: [0.9, 0.28, -1.05], delay: 0.46 },
  { name: 'Suspension', off: [0, 0.04, 0], delay: 0.5 },
]
const SPAN = 0.42
const EXPLODED_YAW = -0.32

const LABELS: { part: string; hs?: string; nudge?: V3; label: string; sub: string; to: string; side?: 'left' | 'right' }[] = [
  { part: 'Engine', hs: 'HS_Engine', label: 'Engine', sub: 'makes the push', to: '/learn/engine' },
  { part: 'Battery', hs: 'HS_Battery', label: 'Battery', sub: 'wakes everything up', to: '/learn/under-the-hood' },
  { part: 'Radiator', nudge: [0, 0.3, 0], label: 'Radiator', sub: 'keeps it cool', to: '/learn/under-the-hood', side: 'left' },
  { part: 'Wheel_FL', hs: 'HS_Brakes', label: 'Disc brake', sub: 'turns speed into heat', to: '/learn/brakes' },
  { part: 'Wheel_RL', nudge: [0, 0.42, 0], label: 'Tire', sub: 'your grip on the road', to: '/learn/tires' },
  { part: 'Interior', nudge: [0, 0.55, 0.55], label: 'Dashboard', sub: 'the car talking to you', to: '/learn/dashboard', side: 'left' },
  { part: 'Wheel_RR', nudge: [0, 0.42, 0], label: 'Flat?', sub: 'you can change it', to: '/learn/flat-tire', side: 'left' },
  { part: 'Exhaust', hs: 'HS_Exhaust', label: 'Exhaust', sub: 'breathes out', to: '/learn/engine', side: 'left' },
  { part: 'FuelTank', nudge: [0, 0.2, 0], label: 'Fuel tank', sub: 'about 45 litres', to: '/learn/engine' },
  { part: 'Suspension', hs: 'HS_Suspension', label: 'Suspension', sub: 'eats the bumps', to: '/learn/tires', side: 'left' },
]

const v = new THREE.Vector3()
const q = new THREE.Quaternion()
const eul = new THREE.Euler()

function HeroCar() {
  const { root } = useModel('car')
  const navigate = useNavigate()
  const paintMat = useMemo(() => makePaintMaterial(PAINTS[0]), [])
  const yawGroup = useRef<THREE.Group>(null)
  const yaw = useRef({ base: 0.35 })
  const [labelsOn, setLabelsOn] = useState(false)
  const labelsOnRef = useRef(false)

  const rig = useMemo(() => {
    replaceMaterial(root, 'CarPaint', paintMat)
    for (const m of materialsNamed(root, 'BrakeCaliper')) {
      m.color.set('#ff3d9a')
      m.roughness = 0.32
    }
    const head = materialsNamed(root, 'HeadlightEmissive')
    head.forEach((m) => {
      m.emissive.set('#eaf4ff')
      m.emissiveIntensity = 3
    })
    const tail = materialsNamed(root, 'TaillightEmissive')
    tail.forEach((m) => {
      m.emissive.set('#ff1f4b')
      m.emissiveIntensity = 2.4
    })

    const parts = PARTS.flatMap((p) => {
      const obj = node(root, p.name)
      if (!obj) return []
      const r = rest(obj)
      return [{ ...p, obj, r, offV: new THREE.Vector3(...p.off) }]
    })

    root.updateMatrixWorld(true)
    const labels = LABELS.flatMap((l) => {
      const part = node(root, l.part)
      if (!part || !part.parent) return []
      const hs = l.hs ? node(root, l.hs) : null
      const world = hs ? hs.getWorldPosition(new THREE.Vector3()) : new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3())
      if (l.nudge) world.add(new THREE.Vector3(...l.nudge))
      const anchor = part.parent.worldToLocal(world)
      return [{ ...l, obj: part, offset: anchor.sub(part.position.clone()) }]
    })

    return { parts, labels, head, exhaust: node(root, 'HS_Exhaust') }
  }, [root, paintMat])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    landing.explodeS = damp(landing.explodeS, landing.explode, 3.4, dt)
    const e = landing.explodeS

    const paint = PAINTS.find((p) => p.id === landing.paint) ?? PAINTS[0]
    lerpPaint(paintMat, paint, 1 - Math.exp(-dt * 4.5))

    landing.rpm = damp(landing.rpm, landing.rev ? REDLINE_RPM : IDLE_RPM, landing.rev ? 2.0 : 1.5, dt)
    landing.sound.setRpm(landing.rpm)
    const k = clamp((landing.rpm - IDLE_RPM) / (REDLINE_RPM - IDLE_RPM), 0, 1)

    // turntable: free spin in the hero, settles to a fixed 3/4 view while exploding
    const y = yaw.current
    y.base += dt * 0.16 * (1 - smooth(clamp(e * 2, 0, 1)))
    const settle = EXPLODED_YAW + Math.PI * 2 * Math.round((y.base - EXPLODED_YAW) / (Math.PI * 2))
    if (yawGroup.current) yawGroup.current.rotation.y = THREE.MathUtils.lerp(y.base, settle, easeInOutCubic(clamp(e * 1.6, 0, 1)))

    const shake = 0.0012 + k * 0.006
    rig.parts.forEach((p, i) => {
      const lt = easeInOutCubic(clamp((e - p.delay) / SPAN, 0, 1))
      p.obj.position.copy(p.r.p).addScaledVector(p.offV, lt)
      if (p.sprung) p.obj.position.y += (Math.sin(t * 61 + i) * 0.6 + Math.sin(t * 37 + i * 2) * 0.4) * shake * (1 - lt * 0.7)
      if (p.spin) {
        eul.set(p.spin[0] * lt, p.spin[1] * lt, p.spin[2] * lt)
        p.obj.quaternion.copy(p.r.q).multiply(q.setFromEuler(eul))
      }
    })

    rig.head.forEach((m) => (m.emissiveIntensity = 2.6 + k * 3 + (k > 0.9 ? Math.sin(t * 40) * 0.6 : 0)))

    const on = e > 0.8
    if (on !== labelsOnRef.current) {
      labelsOnRef.current = on
      setLabelsOn(on)
    }
  })

  return (
    <>
      <group ref={yawGroup}>
        <primitive object={root} />
        <Turntable />
      </group>
      {rig.labels.map((l) => (
        <FollowLabel key={l.label} obj={l.obj} offset={l.offset}>
          <Hotspot position={[0, 0, 0]} label={l.label} sub={l.sub} side={l.side} visible={labelsOn} onClick={() => navigate(l.to)} />
        </FollowLabel>
      ))}
      <ExhaustPop anchor={rig.exhaust} />
    </>
  )
}

function FollowLabel({ obj, offset, children }: { obj: THREE.Object3D; offset: THREE.Vector3; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current || !obj.parent) return
    v.copy(obj.position).add(offset)
    obj.parent.localToWorld(v)
    ref.current.position.copy(v)
  })
  return <group ref={ref}>{children}</group>
}

/** A backfire flash at the tailpipe when you let go of the rev at high rpm. */
function ExhaustPop({ anchor }: { anchor: THREE.Object3D | null }) {
  const mesh = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb547').multiplyScalar(6), transparent: true, toneMapped: false }), [])
  useFrame(() => {
    if (!anchor || !mesh.current || !light.current) return
    const age = (performance.now() - landing.pop) / 1000
    const a = age < 0.22 ? 1 - age / 0.22 : 0
    anchor.getWorldPosition(v)
    mesh.current.position.copy(v)
    light.current.position.copy(v)
    mesh.current.scale.setScalar(0.05 + (1 - a) * 0.22 * (a > 0 ? 1 : 0))
    mat.opacity = a
    mesh.current.visible = a > 0
    light.current.intensity = a * 25
  })
  return (
    <>
      <mesh ref={mesh} material={mat} visible={false}>
        <sphereGeometry args={[1, 16, 12]} />
      </mesh>
      <pointLight ref={light} color="#ff9a3d" intensity={0} distance={4} decay={2} />
    </>
  )
}

function Turntable() {
  const ticks = useMemo(() => {
    const g = new THREE.BoxGeometry(0.02, 0.004, 0.14)
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff86c4').multiplyScalar(1.6), toneMapped: false })
    const inst = new THREE.InstancedMesh(g, m, 96)
    const mtx = new THREE.Matrix4()
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2
      const r = i % 8 === 0 ? 3.42 : 3.38
      mtx.compose(new THREE.Vector3(Math.sin(a) * r, 0.004, Math.cos(a) * r), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), new THREE.Vector3(1, 1, i % 8 === 0 ? 1.8 : 1))
      inst.setMatrixAt(i, mtx)
    }
    return inst
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]}>
        <ringGeometry args={[3.2, 3.24, 160]} />
        <meshBasicMaterial color={new THREE.Color('#ff3d9a').multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      <primitive object={ticks} />
    </group>
  )
}

function NeonTitle() {
  const group = useRef<THREE.Group>(null)
  const fill = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3d9a').multiplyScalar(2.2), toneMapped: false, transparent: true }), [])
  const line = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color('#e9ddff').multiplyScalar(1.4), toneMapped: false, transparent: true }), [])
  const born = useRef(-1)
  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    if (landing.ready && born.current < 0) born.current = t
    const since = born.current < 0 ? 0 : t - born.current
    // neon tubes stutter on, then hum
    const flick = since < 1.6 ? (Math.sin(since * 47) > 0.2 || since > 1.2 ? 1 : 0.12) * clamp(since * 2, 0, 1) : 1 - (Math.random() < 0.006 ? 0.5 : 0)
    const fade = 1 - smooth(clamp(landing.hero * 1.15 + landing.explodeS * 2, 0, 1))
    fill.opacity = fade * flick
    line.opacity = fade * clamp((since - 0.5) * 2, 0, 1)
    group.current.position.y = -landing.hero * 1.2
    group.current.visible = fade > 0.001
  })
  return (
    <group ref={group} position={[0, 0, 0]}>
      <group position={[-1.2, 0, -4.4]} rotation-y={0.42}>
        <Text font="/fonts/unbounded-900.woff" fontSize={2.45} letterSpacing={-0.05} position={[0, 3.25, 0]} anchorX="center" anchorY="middle" material={fill}>
          CAR4
        </Text>
        <Text
          font="/fonts/unbounded-900.woff"
          fontSize={2.45}
          letterSpacing={-0.05}
          position={[0, 1.2, 0]}
          anchorX="center"
          anchorY="middle"
          material={line}
          fillOpacity={0}
          strokeWidth={0.035}
          strokeColor="#f1e6ff"
        >
          GIRL2
        </Text>
      </group>
    </group>
  )
}

function CameraDirector() {
  const { camera, size } = useThree()
  const born = useRef(-1)
  const goal = useMemo(() => new THREE.Vector3(), [])
  const look = useMemo(() => new THREE.Vector3(), [])
  const lookS = useMemo(() => new THREE.Vector3(0, 0.6, 0), [])
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (landing.ready && born.current < 0) born.current = t
    const aspect = size.width / size.height
    const portrait = aspect < 1.05
    const k = portrait ? 1 + (1.05 / aspect - 1) * 0.85 : 1
    const c = easeInOutCubic(clamp(landing.hero * 0.35 + landing.explodeS * 0.65, 0, 1))
    const lookY = portrait ? 0.05 : 0.62

    look.set(0, THREE.MathUtils.lerp(lookY, portrait ? 0.6 : 1.0, c), THREE.MathUtils.lerp(0, 0.15, c))
    goal.set(THREE.MathUtils.lerp(5.0, 6.8, c), THREE.MathUtils.lerp(1.4, 4.6, c), THREE.MathUtils.lerp(6.3, 8.6, c))
    goal.sub(look).multiplyScalar(k).add(look)
    goal.x += landing.px * 0.55
    goal.y += -landing.py * 0.3

    // intro swoop once the car is ready
    const it = born.current < 0 ? 0 : easeOutCubic(clamp((t - born.current) / 2.6, 0, 1))
    goal.lerp(v.set(11, 0.5, 13).multiplyScalar(k), 1 - it)

    camera.position.lerp(goal, 1 - Math.exp(-dt * 3.5))
    lookS.lerp(look, 1 - Math.exp(-dt * 4))
    camera.lookAt(lookS)
  })
  return null
}

export function LandingScene({ lowPower = false }: { lowPower?: boolean }) {
  return (
    <>
      <color attach="background" args={['#0d0812']} />
      <fog attach="fog" args={['#0d0812', 13, 32]} />
      <StudioEnvironment />
      <ambientLight intensity={0.12} />
      <spotLight position={[0, 9, 3]} angle={0.55} penumbra={1} intensity={180} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-6, 3, -4]} angle={0.6} penumbra={1} intensity={90} color="#ff3d9a" />
      <spotLight position={[6, 2.5, -5]} angle={0.6} penumbra={1} intensity={70} color="#7cc8ff" />
      <Suspense fallback={null}>
        <HeroCar />
        <NeonTitle />
      </Suspense>
      <ReflectiveFloor resolution={lowPower ? 512 : 1024} />
      <SoftShadow scale={11} opacity={0.85} />
      <Sparkles count={lowPower ? 30 : 70} scale={[16, 6, 16]} position={[0, 2.5, 0]} size={2.4} speed={0.25} color="#ff86c4" opacity={0.55} />
      <CameraDirector />
      <EffectComposer multisampling={lowPower ? 0 : 4}>
        <Bloom mipmapBlur intensity={0.8} luminanceThreshold={1} luminanceSmoothing={0.25} />
        <ToneMapping mode={ToneMappingMode.NEUTRAL} />
        <Vignette darkness={0.6} offset={0.22} />
      </EffectComposer>
    </>
  )
}
