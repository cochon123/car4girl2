import { useFrame } from '@react-three/fiber'
import { useRef, type ComponentProps } from 'react'
import * as THREE from 'three'
import { Hotspot } from './Hotspot'

const v = new THREE.Vector3()

/** A Hotspot that tracks an object's world position every frame (so labels ride along with moving parts). */
export function NodeLabel({ obj, offset, ...props }: { obj: THREE.Object3D | null; offset?: [number, number, number] } & Omit<ComponentProps<typeof Hotspot>, 'position'>) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!obj || !ref.current) return
    obj.getWorldPosition(v)
    if (offset) v.add({ x: offset[0], y: offset[1], z: offset[2] } as THREE.Vector3)
    ref.current.position.copy(v)
  })
  if (!obj) return null
  return (
    <group ref={ref}>
      <Hotspot position={[0, 0, 0]} {...props} />
    </group>
  )
}
