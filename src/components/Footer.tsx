import { Link } from 'react-router'
import { LESSONS } from '../content/lessons'
import { Wordmark } from './Nav'

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__brand">
        <Wordmark />
        <p>A free, interactive car school for anyone who’s ever been told “it’s complicated”.</p>
      </div>
      <nav className="footer__links" aria-label="All lessons">
        {LESSONS.map((l) => (
          <Link key={l.slug} to={`/learn/${l.slug}`}>
            <span className="mono">{l.num}</span> {l.short}
          </Link>
        ))}
      </nav>
      <p className="footer__fine">
        A learning resource, not a repair manual: your owner’s manual always wins, and when something feels wrong, a good mechanic will happily explain. Models built
        procedurally in Blender, rendered live with three.js.
      </p>
    </footer>
  )
}
