import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei'

/** Studio reflections: soft top box, long strip lights, pink + blue rim panels. No HDR files. */
export function StudioEnvironment({ intensity = 1, warm = false }: { intensity?: number; warm?: boolean }) {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={intensity}>
      <color attach="background" args={['#07040a']} />
      <Lightformer form="rect" intensity={2.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
      {[-4, -1.5, 1, 3.5].map((z) => (
        <Lightformer key={z} form="rect" intensity={3.2} position={[0, 4.2, z]} rotation-x={Math.PI / 2} scale={[10, 0.35, 1]} />
      ))}
      <Lightformer form="rect" color={warm ? '#ffd2b0' : '#ff3d9a'} intensity={5} position={[-7, 1.6, 0]} rotation-y={Math.PI / 2} scale={[12, 1.4, 1]} />
      <Lightformer form="rect" color={warm ? '#cfe6ff' : '#7cc8ff'} intensity={4} position={[7, 1.4, -1]} rotation-y={-Math.PI / 2} scale={[12, 1.2, 1]} />
      <Lightformer form="rect" color="#ffffff" intensity={1.6} position={[0, 1.5, 8]} scale={[10, 3, 1]} />
      <Lightformer form="ring" color="#a98bff" intensity={3} position={[0, 2, -8]} scale={4} />
    </Environment>
  )
}

export function ReflectiveFloor({ color = '#0b0710', resolution = 1024 }: { color?: string; resolution?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={resolution}
        mixBlur={1}
        mixStrength={3.2}
        roughness={0.9}
        depthScale={1.1}
        minDepthThreshold={0.35}
        maxDepthThreshold={1.3}
        color={color}
        metalness={0.55}
        mirror={0.75}
      />
    </mesh>
  )
}

export function SoftShadow({ scale = 10, opacity = 0.75, y = 0.002 }: { scale?: number; opacity?: number; y?: number }) {
  return <ContactShadows position={[0, y, 0]} opacity={opacity} scale={scale} blur={2.6} far={2.5} resolution={512} color="#000000" />
}

/** A simple lighting rig for the lesson pages: env reflections + a key light. */
export function LessonLights({ warm = false }: { warm?: boolean }) {
  return (
    <>
      <StudioEnvironment intensity={0.9} warm={warm} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} />
      <directionalLight position={[-5, 3, -4]} intensity={0.6} color="#ff86c4" />
    </>
  )
}
