import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { landing } from '../lib/landingState'
import { Tach } from './Tach'
import './preloader.css'

/** "Turning the key": a tachometer that sweeps with the real asset loading progress. */
export function Preloader() {
  const { progress, active, total } = useProgress()
  const [gone, setGone] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const done = total > 0 && !active && progress >= 100

  useEffect(() => {
    if (!done || leaving) return
    const t1 = window.setTimeout(() => {
      setLeaving(true)
      landing.ready = true
    }, 450)
    const t2 = window.setTimeout(() => setGone(true), 1500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [done, leaving])

  // never trap anyone behind a loader: give up waiting after 20s
  useEffect(() => {
    const t = window.setTimeout(() => {
      setLeaving(true)
      landing.ready = true
      window.setTimeout(() => setGone(true), 1100)
    }, 20000)
    return () => window.clearTimeout(t)
  }, [])

  if (gone) return null
  const p = Math.round(progress)
  return (
    <div className={`preloader ${leaving ? 'is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="preloader__half preloader__half--top" />
      <div className="preloader__half preloader__half--bottom" />
      <div className="preloader__inner">
        <Tach value={(p / 100) * 8} size={220} redline={6.5} />
        <p className="preloader__label mono">{done ? 'VROOM.' : `IGNITION · ${p}%`}</p>
        <p className="preloader__hint">Turning the key…</p>
      </div>
    </div>
  )
}
