import { Link } from 'react-router'

export function NotFound() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: '120px 16px' }}>
      <div>
        <p className="kicker">Error 404 · wrong turn</p>
        <h1 style={{ fontSize: 'clamp(48px, 10vw, 120px)', margin: '16px 0 20px' }}>Recalculating…</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 28 }}>That page took a wrong exit. Let’s get you back on the road.</p>
        <Link to="/" className="btn btn--candy">
          Back to the garage →
        </Link>
      </div>
    </main>
  )
}
