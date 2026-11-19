import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export const DRACO_PATH = '/draco/'

export const MODELS = {
  car: '/models/car.glb',
  engine: '/models/engine-cutaway.glb',
  wheel: '/models/wheel-brake.glb',
  bay: '/models/engine-bay.glb',
} as const

export type ModelKey = keyof typeof MODELS

export function preloadModel(key: ModelKey) {
  useGLTF.preload(MODELS[key], DRACO_PATH)
}

/**
 * Loads a model and returns a private deep clone (materials included), so a page can
 * move nodes and tweak materials without leaking changes into other pages that share
 * the cached glTF.
 */
export function useModel(key: ModelKey) {
  const gltf = useGLTF(MODELS[key], DRACO_PATH)
  return useMemo(() => {
    const root = gltf.scene.clone(true)
    const cache = new Map<THREE.Material, THREE.Material>()
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const swap = (m: THREE.Material) => {
        let c = cache.get(m)
        if (!c) {
          c = m.clone()
          cache.set(m, c)
        }
        return c
      }
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
    })
    return { root, materials: [...cache.values()] }
  }, [gltf])
}

export function node(root: THREE.Object3D, name: string) {
  return root.getObjectByName(name) ?? null
}

/** All materials whose name matches, across a subtree. */
export function materialsNamed(root: THREE.Object3D, name: string) {
  const out = new Set<THREE.MeshStandardMaterial>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) if (m.name === name || m.name.startsWith(name + '.')) out.add(m as THREE.MeshStandardMaterial)
  })
  return [...out]
}

/** Replace every material named `name` in a subtree. */
export function replaceMaterial(root: THREE.Object3D, name: string, next: THREE.Material) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => (m.name === name || m.name.startsWith(name + '.') ? next : m))
    } else if (mesh.material.name === name || mesh.material.name.startsWith(name + '.')) {
      mesh.material = next
    }
  })
}

export function worldPosition(o: THREE.Object3D | null, fallback: THREE.Vector3Tuple = [0, 0, 0]): THREE.Vector3Tuple {
  if (!o) return fallback
  o.updateWorldMatrix(true, false)
  const v = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld)
  return [v.x, v.y, v.z]
}

/** Remember a node's rest transform once so animation code can offset from it. */
export function rest(o: THREE.Object3D) {
  const u = o.userData as { rest?: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 } }
  if (!u.rest) u.rest = { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }
  return u.rest
}

export const damp = THREE.MathUtils.damp
export const clamp = THREE.MathUtils.clamp
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
