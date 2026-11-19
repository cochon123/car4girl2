import { Html } from '@react-three/drei'
import type { CSSProperties } from 'react'
import type { Vector3Tuple } from 'three'
import './hotspot.css'

type Props = {
  position: Vector3Tuple
  label: string
  sub?: string
  active?: boolean
  dim?: boolean
  side?: 'left' | 'right'
  onClick?: () => void
  color?: string
  visible?: boolean
}

/** A pulsing dot in 3D space with a pill label. Clickable. */
export function Hotspot({ position, label, sub, active, dim, side = 'right', onClick, color, visible = true }: Props) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <button
        type="button"
        className={`hs ${active ? 'is-active' : ''} ${dim ? 'is-dim' : ''} hs--${side} ${visible ? '' : 'is-hidden'}`}
        style={color ? ({ '--hs': color } as CSSProperties) : undefined}
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        aria-label={sub ? `${label}: ${sub}` : label}
      >
        <span className="hs__dot" />
        <span className="hs__pill">
          <span className="hs__label">{label}</span>
          {sub && <span className="hs__sub">{sub}</span>}
        </span>
      </button>
    </Html>
  )
}
