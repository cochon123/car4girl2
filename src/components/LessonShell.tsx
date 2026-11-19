import { Canvas } from '@react-three/fiber'
import { CameraControls, useProgress } from '@react-three/drei'
import { Suspense, useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import type CameraControlsImpl from 'camera-controls'
import { lessonBySlug, nextLesson } from '../content/lessons'
import { markDone, useDone } from '../lib/progress'
import { LessonLights } from '../three/Studio'
import './lesson.css'

export type View = [number, number, number, number, number, number]

/** Smoothly moves the camera to `view` = [px, py, pz, tx, ty, tz] whenever it changes. */
export function CameraRig({ view, minDistance = 0.3, maxDistance = 12 }: { view: View; minDistance?: number; maxDistance?: number }) {
  const ref = useRef<CameraControlsImpl>(null)
  const first = useRef(true)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    void c.setLookAt(...view, !first.current)
    first.current = false
  }, [view])
  return <CameraControls ref={ref} makeDefault minDistance={minDistance} maxDistance={maxDistance} smoothTime={0.55} dollySpeed={0.6} />
}

export function LessonCanvas({ children, fov = 35, warm = false, shadows = true }: { children: ReactNode; fov?: number; warm?: boolean; shadows?: boolean }) {
  return (
    <>
      <Canvas shadows={shadows} dpr={[1, 1.75]} camera={{ fov, near: 0.02, far: 60, position: [3, 2, 4] }} gl={{ antialias: true }}>
        <color attach="background" args={['#0d0812']} />
        <fog attach="fog" args={['#0d0812', 9, 26]} />
        <LessonLights warm={warm} />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
      <StageLoader />
    </>
  )
}

function StageLoader() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="stage-loader" role="status">
      <span className="stage-loader__bar" style={{ '--p': `${progress}%` } as CSSProperties} />
      <span className="mono">Rolling it out of the garage · {Math.round(progress)}%</span>
    </div>
  )
}

type ShellProps = {
  slug: string
  stage: ReactNode
  children: ReactNode
  stageOverlay?: ReactNode
  hint?: string
}

export function LessonShell({ slug, stage, children, stageOverlay, hint = 'drag to orbit · scroll or pinch to zoom' }: ShellProps) {
  const meta = lessonBySlug(slug)!
  const next = nextLesson(slug)
  const done = useDone().includes(slug)
  useEffect(() => {
    document.title = `${meta.title} · Car4Girl2`
    return () => {
      document.title = 'Car4Girl2 · cars, finally explained'
    }
  }, [meta.title])

  return (
    <main className="lesson" style={{ '--accent': meta.accent } as CSSProperties}>
      <div className="lesson__stage">
        {stage}
        {stageOverlay}
        <p className="lesson__hint mono" aria-hidden="true">
          {hint}
        </p>
      </div>
      <aside className="lesson__panel" aria-label={`${meta.title} lesson`}>
        <div className="lesson__scroll">
          <header className="lesson__head">
            <p className="kicker">
              Lesson {meta.num} · {meta.minutes} min
            </p>
            <h1>{meta.title}</h1>
          </header>
          {children}
          <footer className="lesson__foot">
            <button className={`btn ${done ? 'btn--ghost' : 'btn--candy'}`} onClick={() => markDone(slug)} disabled={done}>
              {done ? '✓ Lesson complete' : 'I’ve got this, mark complete'}
            </button>
            <Link className="lesson__next" to={`/learn/${next.slug}`}>
              <span className="mono">Next · {next.num}</span>
              <strong>{next.title} →</strong>
            </Link>
          </footer>
        </div>
      </aside>
    </main>
  )
}

/** A titled block inside the panel. */
export function Block({ title, kicker, children, id }: { title?: string; kicker?: string; children: ReactNode; id?: string }) {
  return (
    <section className="lblock" id={id}>
      {kicker && <p className="kicker">{kicker}</p>}
      {title && <h2>{title}</h2>}
      {children}
    </section>
  )
}

export function Callout({ tone = 'tip', children }: { tone?: 'tip' | 'warn' | 'stop'; children: ReactNode }) {
  const label = tone === 'tip' ? 'Good to know' : tone === 'warn' ? 'Heads up' : 'Safety first'
  return (
    <div className={`callout callout--${tone}`}>
      <span className="callout__tag mono">{label}</span>
      <div>{children}</div>
    </div>
  )
}
