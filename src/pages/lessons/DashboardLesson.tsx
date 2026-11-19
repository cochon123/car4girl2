import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Block, Callout, LessonShell } from '../../components/LessonShell'
import './dashboard.css'

type Sev = 'stop' | 'soon' | 'info'
type Light = { id: string; name: string; color: 'red' | 'amber' | 'green' | 'blue'; sev: Sev; means: string; todo: string; icon: ReactNode }

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const LIGHTS: Light[] = [
  {
    id: 'engine',
    name: 'Check engine',
    color: 'amber',
    sev: 'soon',
    means: 'The engine computer spotted a fault in the engine or emissions system. It can be anything from a loose fuel cap to a misfire.',
    todo: 'Steady: tighten the fuel cap and book a check soon. Flashing: a serious misfire. Slow down and get it looked at right away.',
    icon: (
      <g {...S}>
        <path d="M2.5 10.5v4M2.5 12.5H5" />
        <path d="M5 9.5h2.5V8h3V6.5h3V8H17l2 2.2h2.5v4.8H19l-2 2.5H9.5L7.5 15.5H5z" />
      </g>
    ),
  },
  {
    id: 'oil',
    name: 'Oil pressure',
    color: 'red',
    sev: 'stop',
    means: 'Oil pressure has dropped, so the engine is not being lubricated properly.',
    todo: 'Pull over safely and switch the engine off as soon as you can. Check the oil level. Do not keep driving until it is sorted.',
    icon: (
      <g {...S}>
        <path d="M2 10.5h3l1.5-1.5H11l1.5 1.5L19.5 8l1.6 1.2-6.6 6.3H6.5L5 14v-1.8H2z" />
        <path d="M8.2 9V7.2h2.2V9" />
        <path d="M20.6 14c0 .9-.5 1.5-1.1 1.5s-1.1-.6-1.1-1.5c0-.8 1.1-2.1 1.1-2.1s1.1 1.3 1.1 2.1z" fill="currentColor" />
      </g>
    ),
  },
  {
    id: 'battery',
    name: 'Charging system',
    color: 'red',
    sev: 'stop',
    means: 'The battery is not being recharged, usually because of the alternator or its belt. You are running on battery power only.',
    todo: 'Switch off extras (heated seats, radio) and drive straight to a garage or home. The car may cut out when the battery runs flat.',
    icon: (
      <g {...S}>
        <rect x="3" y="7.5" width="18" height="11" rx="1.5" />
        <path d="M6.5 7.5V5.6h3v1.9M14.5 7.5V5.6h3v1.9M6.4 13h3M16 11.5v3M14.5 13h3" />
      </g>
    ),
  },
  {
    id: 'temp',
    name: 'Engine overheating',
    color: 'red',
    sev: 'stop',
    means: 'The coolant is too hot: the engine is overheating.',
    todo: 'Pull over and turn the engine off to let it cool. Never open the coolant cap while hot. Turning the heater to max helps a little while you find a safe place.',
    icon: (
      <g {...S}>
        <path d="M11 3.5v9.3M11 5h3M11 7.6h3M11 10.2h3" />
        <circle cx="11" cy="14.8" r="2.2" />
        <path d="M2.5 20c1.6 0 1.6-1 3.2-1s1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1" />
      </g>
    ),
  },
  {
    id: 'brake',
    name: 'Brake system',
    color: 'red',
    sev: 'stop',
    means: 'Either the parking brake is on, or brake fluid is low and there may be a fault in the brakes.',
    todo: 'Check the parking brake is fully off. If the light stays on, do not drive further than you must: get the brakes checked.',
    icon: (
      <g {...S}>
        <circle cx="12" cy="12" r="6" />
        <path d="M5.4 6.3a8.2 8.2 0 0 0 0 11.4M18.6 6.3a8.2 8.2 0 0 1 0 11.4M12 8.6v4" />
        <circle cx="12" cy="15.2" r=".5" fill="currentColor" />
      </g>
    ),
  },
  {
    id: 'abs',
    name: 'ABS',
    color: 'amber',
    sev: 'soon',
    means: 'The anti-lock brakes have a fault. Your normal brakes still work, but the wheels can lock up in an emergency stop.',
    todo: 'Drive gently, leave more space to the car ahead, and get it checked soon.',
    icon: (
      <g {...S}>
        <circle cx="12" cy="12" r="6" />
        <path d="M5.4 6.3a8.2 8.2 0 0 0 0 11.4M18.6 6.3a8.2 8.2 0 0 1 0 11.4" />
        <text x="12" y="13.9" fontSize="5.2" fontWeight="800" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="DM Sans, sans-serif">
          ABS
        </text>
      </g>
    ),
  },
  {
    id: 'tpms',
    name: 'Tire pressure',
    color: 'amber',
    sev: 'soon',
    means: 'One or more tires are low on air.',
    todo: 'Check and inflate at the next gas station. The right pressure is on the sticker in the driver’s door frame. If it flashes first, the sensor system itself has a fault.',
    icon: (
      <g {...S}>
        <path d="M6.2 5c-2 2.6-3 5.2-3 7.8 0 2.4.9 4.4 2.2 5.9h13.2c1.3-1.5 2.2-3.5 2.2-5.9 0-2.6-1-5.2-3-7.8" />
        <path d="M5.5 21h2.2M10.9 21h2.2M16.3 21h2.2M12 8.4v5" />
        <circle cx="12" cy="15.9" r=".5" fill="currentColor" />
      </g>
    ),
  },
  {
    id: 'airbag',
    name: 'Airbag',
    color: 'red',
    sev: 'soon',
    means: 'There is a fault in the airbags or seatbelt tensioners: they might not work in a crash.',
    todo: 'The car drives normally, but get it fixed as soon as you can.',
    icon: (
      <g {...S}>
        <circle cx="8.5" cy="4.6" r="1.8" />
        <path d="M8 8.2 7 13.6h4.8l2.4 6M7 13.6 5.4 19.6" />
        <circle cx="16.6" cy="9.6" r="3.6" />
      </g>
    ),
  },
  {
    id: 'belt',
    name: 'Seatbelt',
    color: 'red',
    sev: 'stop',
    means: 'Someone is not buckled up.',
    todo: 'Click it. Red means act now, and this one takes a second.',
    icon: (
      <g {...S}>
        <circle cx="12" cy="4.4" r="1.8" />
        <path d="M7.8 21v-7.4c0-2.5 1.9-4.5 4.2-4.5s4.2 2 4.2 4.5V21M9 9.6l6.6 9.4" />
      </g>
    ),
  },
  {
    id: 'fuel',
    name: 'Low fuel',
    color: 'amber',
    sev: 'soon',
    means: 'You are on the reserve: typically around 50 to 80 km (30 to 50 miles) left, depending on the car.',
    todo: 'Head to a gas station. Bonus tip: the little arrow next to the pump icon on your gauge shows which side the fuel door is on.',
    icon: (
      <g {...S}>
        <path d="M5 20V5.5C5 4.7 5.7 4 6.5 4h6c.8 0 1.5.7 1.5 1.5V20M3.5 20h12" />
        <path d="M6.6 7.2h5.8v3.6H6.6z" />
        <path d="M14 9h2l2 2v6.4a1.2 1.2 0 0 0 2.4 0V8L18 5.6" />
      </g>
    ),
  },
  {
    id: 'traction',
    name: 'Stability control',
    color: 'amber',
    sev: 'soon',
    means: 'Flashing: the system is actively stopping a wheel from spinning, which is normal on slippery roads. Steady: it is switched off or has a fault.',
    todo: 'Flashing: ease off the gas a little. Steady: check you didn’t switch it off by accident, otherwise get it checked.',
    icon: (
      <g {...S}>
        <path d="M5 12.2 6.6 8h10.8l1.6 4.2v3.4H5z M6.3 15.6v1.6M17.7 15.6v1.6" />
        <path d="M7.5 21c1.3-.9-.5-1.9.8-2.9M15.7 21c1.3-.9-.5-1.9.8-2.9" />
      </g>
    ),
  },
  {
    id: 'high',
    name: 'High beams',
    color: 'blue',
    sev: 'info',
    means: 'Your full-power headlights are on.',
    todo: 'Great on dark, empty roads. Dip them for oncoming traffic so you don’t dazzle other drivers.',
    icon: (
      <g {...S}>
        <path d="M13 6.5c4 0 7.5 2.4 7.5 5.5S17 17.5 13 17.5z" />
        <path d="M3 8h7M3 11h7M3 14h7M3 17h7" />
      </g>
    ),
  },
  {
    id: 'low',
    name: 'Headlights on',
    color: 'green',
    sev: 'info',
    means: 'Your normal (dipped) headlights are on.',
    todo: 'Nothing to do. If it is getting dark and this is off, switch them on.',
    icon: (
      <g {...S}>
        <path d="M13 6.5c4 0 7.5 2.4 7.5 5.5S17 17.5 13 17.5z" />
        <path d="M10 8 3 10M10 11 3 13M10 14 3 16M10 17 3 19" />
      </g>
    ),
  },
  {
    id: 'turn',
    name: 'Turn signals',
    color: 'green',
    sev: 'info',
    means: 'Your indicator (or hazards, if both blink) is on.',
    todo: 'If it blinks twice as fast as usual, one of the bulbs has burnt out.',
    icon: (
      <g fill="currentColor">
        <path d="M2 12l5.2-5v3.2h3.4v3.6H7.2V17z" />
        <path d="M22 12l-5.2-5v3.2h-3.4v3.6h3.4V17z" />
      </g>
    ),
  },
]

const SEV_TEXT: Record<Sev, string> = { stop: 'Stop safely soon', soon: 'Get it checked soon', info: 'Just info' }

export default function DashboardLesson() {
  const [phase, setPhase] = useState<'off' | 'check' | 'on'>('off')
  const [picked, setPicked] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<{ id: string; answered: Sev | null } | null>(null)
  const [score, setScore] = useState({ right: 0, total: 0 })
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const turnKey = () => {
    window.clearTimeout(timer.current)
    setQuiz(null)
    setPhase('check')
    timer.current = window.setTimeout(() => setPhase('on'), 2200)
  }

  const newQuiz = () => {
    if (phase === 'off') {
      setPhase('on')
    }
    const pool = LIGHTS.filter((l) => l.id !== quiz?.id)
    setQuiz({ id: pool[Math.floor(Math.random() * pool.length)].id, answered: null })
    setPicked(null)
  }

  const lit = (l: Light) => phase === 'check' || (phase !== 'off' && (quiz?.id === l.id || picked === l.id))
  const quizLight = LIGHTS.find((l) => l.id === quiz?.id)
  const info = LIGHTS.find((l) => l.id === picked)

  return (
    <LessonShell
      slug="dashboard"
      hint=""
      stage={
        <div
          className="dash-stage"
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            setTilt({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 12 })
          }}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}
        >
          <div className={`cluster cluster--${phase}`} style={{ '--rx': `${tilt.x + 14}deg`, '--ry': `${tilt.y}deg` } as CSSProperties}>
            <Gauge kind="speed" value={0} on={phase !== 'off'} sweep={phase === 'check'} />
            <div className="cluster__mid">
              <div className="lights" role="group" aria-label="Warning lights">
                {LIGHTS.map((l) => (
                  <button
                    key={l.id}
                    className={`wl wl--${l.color} ${lit(l) ? 'is-lit' : ''} ${picked === l.id ? 'is-picked' : ''} ${l.id === 'turn' && lit(l) ? 'is-blink' : ''}`}
                    onClick={() => {
                      setPicked(l.id)
                      if (phase === 'off') setPhase('on')
                    }}
                    aria-label={l.name}
                    title={l.name}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      {l.icon}
                    </svg>
                  </button>
                ))}
              </div>
              <p className="cluster__msg mono" aria-live="polite">
                {phase === 'off' ? 'IGNITION OFF' : phase === 'check' ? 'BULB CHECK…' : quizLight ? 'WARNING' : 'READY'}
              </p>
            </div>
            <Gauge kind="rpm" value={phase === 'on' ? 0.8 : 0} on={phase !== 'off'} sweep={phase === 'check'} />
          </div>
          <div className="dash-actions">
            <button className="btn btn--candy" onClick={turnKey}>
              🔑 Turn the key
            </button>
            <button className="btn btn--ghost" onClick={newQuiz}>
              Quiz me
            </button>
          </div>
        </div>
      }
    >
      <Block>
        <p>
          Dashboard lights are your car talking to you. You don’t need to memorise every symbol; you need to know <strong>the colours</strong>.
        </p>
        <div className="legend">
          <div className="legend__row legend__row--red">
            <span />
            <div>
              <strong>Red: stop safely soon.</strong> Something is wrong right now.
            </div>
          </div>
          <div className="legend__row legend__row--amber">
            <span />
            <div>
              <strong>Amber: get it checked soon.</strong> Something needs attention.
            </div>
          </div>
          <div className="legend__row legend__row--green">
            <span />
            <div>
              <strong>Green or blue: just info.</strong> Something is switched on.
            </div>
          </div>
        </div>
      </Block>

      <Block title="Try it: turn the key" kicker="The bulb check">
        <p>
          Every time you start the car, <strong>all</strong> the lights come on for a second or two. That’s a bulb check, so you know they all work. Then they go out. If one
          stays on, that’s your sign.
        </p>
      </Block>

      {quizLight && (
        <Block title="This just lit up. What do you do?" kicker={`Quiz · ${score.right}/${score.total}`}>
          <div className="quiz">
            {(['stop', 'soon', 'info'] as Sev[]).map((s) => {
              const chosen = quiz?.answered === s
              const correct = quizLight.sev === s
              return (
                <button
                  key={s}
                  className={`quiz__opt ${quiz?.answered ? (correct ? 'is-right' : chosen ? 'is-wrong' : '') : ''}`}
                  disabled={!!quiz?.answered}
                  onClick={() => {
                    setQuiz((q) => (q ? { ...q, answered: s } : q))
                    setScore((sc) => ({ right: sc.right + (correct ? 1 : 0), total: sc.total + 1 }))
                  }}
                >
                  {SEV_TEXT[s]}
                </button>
              )
            })}
          </div>
          {quiz?.answered && (
            <div className="light-info">
              <strong>
                {quiz.answered === quizLight.sev ? 'Yes! ' : 'Not quite. '}
                {quizLight.name}
              </strong>
              <p>{quizLight.means}</p>
              <p>
                <em>What to do:</em> {quizLight.todo}
              </p>
              <button className="btn btn--candy btn--small" onClick={newQuiz}>
                Next light →
              </button>
            </div>
          )}
        </Block>
      )}

      <Block title={info ? info.name : 'Tap any light'} kicker={info ? SEV_TEXT[info.sev] : 'Learn them one by one'}>
        {info ? (
          <div className={`light-info light-info--${info.color}`}>
            <p>{info.means}</p>
            <p>
              <em>What to do:</em> {info.todo}
            </p>
          </div>
        ) : (
          <p>Tap a symbol on the dashboard to see what it means and what to do about it.</p>
        )}
      </Block>

      <Callout tone="tip">
        <strong>Your car might show words too.</strong> Many newer cars put a message next to the symbol (“Low tire pressure”, “Service due”). The owner’s manual has a page
        with every symbol your exact car uses.
      </Callout>
    </LessonShell>
  )
}

function Gauge({ kind, value, on, sweep }: { kind: 'speed' | 'rpm'; value: number; on: boolean; sweep: boolean }) {
  const max = kind === 'speed' ? 240 : 8
  const ticks = kind === 'speed' ? 12 : 8
  const a = (x: number) => -225 + (x / max) * 270
  const needle = sweep ? 45 : on ? a(kind === 'rpm' ? value : 0) : -225
  return (
    <svg className={`gauge-svg ${on ? 'is-on' : ''}`} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56" className="gauge-svg__ring" />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const deg = a((i / ticks) * max)
        const r1 = 48
        const r2 = 41
        const rad = (deg * Math.PI) / 180
        const red = kind === 'rpm' && i >= 6.5
        return (
          <g key={i}>
            <line x1={60 + Math.cos(rad) * r1} y1={60 + Math.sin(rad) * r1} x2={60 + Math.cos(rad) * r2} y2={60 + Math.sin(rad) * r2} className={red ? 'tick tick--red' : 'tick'} />
            <text x={60 + Math.cos(rad) * 33} y={60 + Math.sin(rad) * 33 + 3} className="gauge-svg__num" textAnchor="middle">
              {kind === 'speed' ? (i * 20) % 40 === 0 ? i * 20 : '' : i}
            </text>
          </g>
        )
      })}
      <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: '60px 60px', transition: sweep ? 'transform 1s cubic-bezier(.5,0,.3,1)' : 'transform 0.8s cubic-bezier(.3,1.4,.5,1)' }}>
        <line x1="60" y1="60" x2="104" y2="60" className="gauge-svg__needle" />
      </g>
      <circle cx="60" cy="60" r="5" className="gauge-svg__hub" />
      <text x="60" y="88" textAnchor="middle" className="gauge-svg__unit">
        {kind === 'speed' ? 'km/h' : 'x1000 rpm'}
      </text>
    </svg>
  )
}
