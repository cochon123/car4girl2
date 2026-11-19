import { useEffect, useState, type CSSProperties } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { LESSONS } from '../content/lessons'
import { useDone } from '../lib/progress'
import './nav.css'

export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className={`wordmark wordmark--${size}`} aria-label="Car4Girl2">
      <span>CAR</span>
      <span className="wordmark__num">4</span>
      <span>GIRL</span>
      <span className="wordmark__num">2</span>
    </span>
  )
}

export function Nav() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const done = useDone()
  const inLesson = pathname.startsWith('/learn/')

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className={`nav ${scrolled || inLesson ? 'is-solid' : ''} ${open ? 'is-open' : ''}`}>
      <Link to="/" className="nav__brand" aria-label="Car4Girl2 home">
        <Wordmark />
      </Link>
      <button className="nav__toggle" aria-expanded={open} aria-controls="nav-lessons" onClick={() => setOpen((v) => !v)}>
        <span>Lessons</span>
        <span className="nav__count mono">
          {done.length}/{LESSONS.length}
        </span>
      </button>
      <nav id="nav-lessons" className="nav__menu" aria-label="Lessons">
        {LESSONS.map((l) => (
          <NavLink key={l.slug} to={`/learn/${l.slug}`} className="nav__item" style={{ '--accent': l.accent } as CSSProperties}>
            <span className="mono nav__num">{l.num}</span>
            <span>{l.short}</span>
            {done.includes(l.slug) && <span className="nav__tick" aria-label="completed">✓</span>}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
