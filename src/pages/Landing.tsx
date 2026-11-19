import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { Link } from 'react-router'
import { Preloader } from '../components/Preloader'
import { Tach } from '../components/Tach'
import { Wordmark } from '../components/Nav'
import { Footer } from '../components/Footer'
import { LESSONS } from '../content/lessons'
import { GLOSSARY, MYTHS } from '../content/landing'
import { IDLE_RPM, landing } from '../lib/landingState'
import { preloadModel } from '../lib/models'
import { PAINTS } from '../lib/paint'
import { useDone } from '../lib/progress'
import { LandingScene } from '../three/LandingScene'
import './landing.css'

preloadModel('car')

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export default function Landing() {
  const explodeRef = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const [stageOn, setStageOn] = useState(true)
  const [lowPower, setLowPower] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches)

  // scroll → shared 3D state
  useEffect(() => {
    landing.explode = 0
    landing.explodeS = 0
    landing.hero = 0
    const onScroll = () => {
      const vh = window.innerHeight
      landing.hero = clamp01(window.scrollY / vh)
      const el = explodeRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        const p = clamp01(-r.top / Math.max(1, r.height - vh))
        landing.explode = p
        setStep(p < 0.3 ? 0 : p < 0.68 ? 1 : 2)
        // stop rendering the 3D stage once the opaque sections fully cover it
        setStageOn(r.bottom > -vh * 0.1)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // pointer parallax
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      landing.px = (e.clientX / window.innerWidth) * 2 - 1
      landing.py = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useEffect(() => () => landing.sound.stop(), [])

  return (
    <div className="landing">
      <Preloader />
      <div className={`stage ${stageOn ? '' : 'is-off'}`} aria-hidden="true">
        <Canvas
          shadows
          dpr={lowPower ? [1, 1.25] : [1, 1.75]}
          frameloop={stageOn ? 'always' : 'never'}
          camera={{ position: [11, 0.5, 13], fov: 30, near: 0.1, far: 80 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
        >
          <PerformanceMonitor onDecline={() => setLowPower(true)} />
          <LandingScene lowPower={lowPower} />
        </Canvas>
      </div>

      <h1 className="sr-only">Car4Girl2: interactive lessons on how cars work</h1>

      <section className="hero" id="top">
        <div className="hero__copy">
          <p className="kicker">Interactive car school · 6 lessons · free</p>
          <h2 className="hero__title">
            Cars, <em>finally</em> explained.
          </h2>
          <p className="hero__lede">Nobody is born knowing what a dipstick is. Spin the car, pop the hood and see how it all works in 3D, at your own pace.</p>
          <div className="hero__ctas">
            <Link to="/learn/engine" className="btn btn--candy">
              Start lesson 01 <span aria-hidden="true">→</span>
            </Link>
            <a href="#apart" className="btn btn--ghost">
              Take it apart <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
        <div className="hero__controls">
          <PaintPicker />
          <RevButton />
        </div>
        <div className="hero__scroll mono" aria-hidden="true">
          <span>scroll</span>
          <span className="hero__scroll-line" />
        </div>
      </section>

      <section className="apart" id="apart" ref={explodeRef}>
        <div className="apart__sticky">
          <div className="apart__copy">
            {APART_STEPS.map((s, i) => (
              <div key={s.title} className={`apart__step ${step === i ? 'is-on' : ''}`} aria-hidden={step !== i}>
                <p className="kicker">{s.kicker}</p>
                <h2>{s.title}</h2>
                <p>{s.body}</p>
              </div>
            ))}
            <div className="apart__dots" aria-hidden="true">
              {APART_STEPS.map((s, i) => (
                <span key={s.title} className={step >= i ? 'is-on' : ''} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="solid">
        <Syllabus />
        <Marquee />
        <Myths />
        <Glossary />
        <FinalCta />
        <Footer />
      </div>
    </div>
  )
}

const APART_STEPS = [
  { kicker: 'Step inside', title: 'A car is about 30,000 parts.', body: 'Bolts, clips and wires included. Sounds like a lot. Keep scrolling.' },
  { kicker: 'Breathe', title: 'You only need to know ten of them.', body: 'The rest is detail. These are the parts that keep you moving, stopping, cool and comfortable.' },
  { kicker: 'Your move', title: 'Tap any part to learn it.', body: 'Every label opens a hands-on lesson. Start anywhere; there is no wrong order.' },
]

function PaintPicker() {
  const [paint, setPaint] = useState(landing.paint)
  const current = PAINTS.find((p) => p.id === paint) ?? PAINTS[0]
  return (
    <div className="paint glass">
      <div className="paint__head">
        <span className="kicker">Pick your paint</span>
        <span className="paint__name">{current.name}</span>
      </div>
      <div className="paint__row" role="radiogroup" aria-label="Car paint colour">
        {PAINTS.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={paint === p.id}
            aria-label={p.name}
            className={`paint__chip ${paint === p.id ? 'is-on' : ''}`}
            style={{ '--swatch': p.swatch } as CSSProperties}
            onClick={() => {
              landing.paint = p.id
              setPaint(p.id)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function RevButton() {
  const [held, setHeld] = useState(false)
  const [rpm, setRpm] = useState(IDLE_RPM)
  const idleTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let raf = 0
    const loop = () => {
      setRpm(landing.rpm)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const press = () => {
    window.clearTimeout(idleTimer.current)
    landing.sound.start()
    landing.rev = true
    setHeld(true)
  }
  const release = () => {
    if (!landing.rev) return
    landing.rev = false
    setHeld(false)
    if (landing.rpm > 4600) landing.pop = performance.now()
    idleTimer.current = window.setTimeout(() => landing.sound.stop(), 3500)
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.key.toLowerCase() !== 'r' || (e.target as HTMLElement)?.closest('input, textarea')) return
      press()
    }
    const up = (e: KeyboardEvent) => e.key.toLowerCase() === 'r' && release()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  })

  const onDown = (e: RPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    press()
  }

  return (
    <div className="rev glass">
      <Tach value={rpm / 1000} size={92} label="rpm" />
      <div className="rev__side">
        <button
          className={`btn btn--candy rev__btn ${held ? 'is-held' : ''}`}
          onPointerDown={onDown}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && press()}
          onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && release()}
          aria-pressed={held}
        >
          Hold to rev
        </button>
        <span className="rev__hint">
          sound on · or hold <kbd>R</kbd>
        </span>
      </div>
    </div>
  )
}

function Syllabus() {
  const done = useDone()
  return (
    <section className="syllabus" id="lessons">
      <header className="section-head">
        <p className="kicker">The syllabus</p>
        <h2>
          Six lessons.
          <br />
          Zero gatekeeping.
        </h2>
        <p>Each one is a hands-on 3D explainer you can spin, poke and take apart. About 40 minutes for the whole lot, in any order you like.</p>
      </header>
      <ol className="cards">
        {LESSONS.map((l) => (
          <li key={l.slug}>
            <Link to={`/learn/${l.slug}`} className="card" style={{ '--accent': l.accent } as CSSProperties}>
              <div className="card__art">
                <img src={`/img/lesson-${l.slug}.webp`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
              </div>
              <div className="card__top">
                <span className="card__num">{l.num}</span>
                <span className="chip">
                  {done.includes(l.slug) ? '✓ done' : `${l.minutes} min`}
                </span>
              </div>
              <div className="card__body">
                <h3>{l.title}</h3>
                <p>{l.blurb}</p>
                <span className="card__skill mono">→ {l.skill}</span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Marquee() {
  const a = ['No dumb questions', 'No gatekeeping', 'No “well, actually”', 'Torque is just twist', 'You can do this']
  const b = ['Pop the hood', 'Check the oil', 'Read the tire', 'Trust your gut', 'Ask the mechanic why']
  const row = (items: string[]) => [...items, ...items, ...items].map((s, i) => (
    <span key={i}>
      {s}
      <i aria-hidden="true">✦</i>
    </span>
  ))
  return (
    <section className="marquee" aria-label="Our promises: no dumb questions, no gatekeeping, you can do this">
      <div className="marquee__row marquee__row--a" aria-hidden="true">
        <div>{row(a)}</div>
      </div>
      <div className="marquee__row marquee__row--b" aria-hidden="true">
        <div>{row(b)}</div>
      </div>
    </section>
  )
}

function Myths() {
  const [flipped, setFlipped] = useState<number[]>([])
  return (
    <section className="myths" id="myths">
      <header className="section-head">
        <p className="kicker">Myth vs. fact</p>
        <h2>Things people say about cars.</h2>
        <p>Some of these get repeated by people who sound very sure of themselves. Tap a card to flip it.</p>
      </header>
      <div className="myths__grid">
        {MYTHS.map((m, i) => {
          const on = flipped.includes(i)
          return (
            <button
              key={m.myth}
              className={`flip ${on ? 'is-flipped' : ''}`}
              onClick={() => setFlipped((f) => (on ? f.filter((x) => x !== i) : [...f, i]))}
              aria-pressed={on}
            >
              <span className="flip__inner">
                <span className="flip__face flip__front">
                  <span className="flip__tag mono">Myth</span>
                  <span className="flip__text">“{m.myth}”</span>
                  <span className="flip__cta mono">tap to flip ↻</span>
                </span>
                <span className="flip__face flip__back">
                  <span className="flip__tag mono">Fact</span>
                  <span className="flip__text flip__text--small">{m.fact}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Glossary() {
  const [open, setOpen] = useState(0)
  const g = GLOSSARY[open]
  return (
    <section className="glossary">
      <header className="section-head">
        <p className="kicker">Say it with confidence</p>
        <h2>The words people throw around.</h2>
      </header>
      <div className="glossary__body">
        <div className="glossary__chips" role="tablist" aria-label="Car words">
          {GLOSSARY.map((w, i) => (
            <button key={w.word} role="tab" aria-selected={open === i} className={`gchip ${open === i ? 'is-on' : ''}`} onClick={() => setOpen(i)}>
              {w.word}
            </button>
          ))}
        </div>
        <div className="glossary__card glass" role="tabpanel" aria-live="polite">
          <p className="kicker">{g.say}</p>
          <h3>{g.word}</h3>
          <p>{g.def}</p>
          {g.lesson && (
            <Link className="glossary__link" to={`/learn/${g.lesson}`}>
              See it in 3D →
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="final">
      <div className="final__inner">
        <p className="kicker">Last thing</p>
        <h2>
          You don’t have to love cars.
          <br />
          <span>You deserve to understand yours.</span>
        </h2>
        <div className="hero__ctas">
          <Link to="/learn/under-the-hood" className="btn btn--candy">
            Do the 5-minute hood check →
          </Link>
          <Link to="/learn/engine" className="btn btn--ghost">
            Start at lesson 01
          </Link>
        </div>
      </div>
      <div className="final__mark" aria-hidden="true">
        <Wordmark size="lg" />
      </div>
    </section>
  )
}
