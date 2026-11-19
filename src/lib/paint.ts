import * as THREE from 'three'

export type Paint = {
  id: string
  name: string
  swatch: string
  color: string
  metalness: number
  roughness: number
  iridescence: number
  sheen?: string
}

export const PAINTS: Paint[] = [
  { id: 'chameleon', name: 'Chameleon', swatch: 'conic-gradient(from 200deg, #ff3d9a, #a98bff, #3de0ff, #8cff9a, #ff3d9a)', color: '#3a1a52', metalness: 0.85, roughness: 0.28, iridescence: 1 },
  { id: 'bubblegum', name: 'Bubblegum', swatch: '#ff5fa8', color: '#ff4f9e', metalness: 0.35, roughness: 0.32, iridescence: 0.25 },
  { id: 'cherry', name: 'Cherry Bomb', swatch: '#d8143a', color: '#b30c2c', metalness: 0.55, roughness: 0.3, iridescence: 0.1 },
  { id: 'lilac', name: 'Lilac Chrome', swatch: '#b9a6ff', color: '#b6a2ff', metalness: 0.95, roughness: 0.18, iridescence: 0.55 },
  { id: 'mint', name: 'Mint Condition', swatch: '#8ff0c8', color: '#7fe8c0', metalness: 0.3, roughness: 0.3, iridescence: 0.2 },
  { id: 'midnight', name: 'Midnight', swatch: '#1b2550', color: '#121a3d', metalness: 0.7, roughness: 0.3, iridescence: 0.35 },
  { id: 'pearl', name: 'Pearl', swatch: '#f4efe9', color: '#efe9e2', metalness: 0.2, roughness: 0.25, iridescence: 0.6 },
]

export function makePaintMaterial(p: Paint) {
  const m = new THREE.MeshPhysicalMaterial({
    name: 'CarPaint',
    color: new THREE.Color(p.color),
    metalness: p.metalness,
    roughness: p.roughness,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    iridescence: p.iridescence,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [180, 760],
    envMapIntensity: 1.25,
  })
  return m
}

/** Smoothly move a paint material toward a preset (call every frame). */
export function lerpPaint(m: THREE.MeshPhysicalMaterial, p: Paint, k: number) {
  const target = tmp.set(p.color)
  m.color.lerp(target, k)
  m.metalness += (p.metalness - m.metalness) * k
  m.roughness += (p.roughness - m.roughness) * k
  m.iridescence += (p.iridescence - m.iridescence) * k
}

const tmp = new THREE.Color()
