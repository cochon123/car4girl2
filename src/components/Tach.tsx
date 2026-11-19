/** An SVG tachometer. `value` is in thousands of rpm (0–8). */
export function Tach({ value, size = 160, redline = 6.5, label = 'x1000 rpm' }: { value: number; size?: number; redline?: number; label?: string }) {
  const max = 8
  const a0 = -225
  const a1 = 45
  const ang = (x: number) => a0 + (Math.min(max, Math.max(0, x)) / max) * (a1 - a0)
  const pt = (deg: number, r: number) => {
    const rad = (deg * Math.PI) / 180
    return [50 + Math.cos(rad) * r, 50 + Math.sin(rad) * r]
  }
  const arc = (from: number, to: number, r: number) => {
    const [x0, y0] = pt(ang(from), r)
    const [x1, y1] = pt(ang(to), r)
    const large = ang(to) - ang(from) > 180 ? 1 : 0
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`
  }
  const needle = ang(value)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="tach" aria-hidden="true">
      <defs>
        <linearGradient id="tach-g" x1="0" x2="1">
          <stop offset="0" stopColor="#a98bff" />
          <stop offset="1" stopColor="#ff3d9a" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" />
      <path d={arc(0, max, 40)} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" strokeLinecap="round" />
      <path d={arc(0, Math.max(0.001, Math.min(value, max)), 40)} fill="none" stroke="url(#tach-g)" strokeWidth="3" strokeLinecap="round" />
      <path d={arc(redline, max, 40)} fill="none" stroke="#ff4d5e" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      {Array.from({ length: max + 1 }, (_, i) => {
        const [x0, y0] = pt(ang(i), 33)
        const [x1, y1] = pt(ang(i), 29)
        const [tx, ty] = pt(ang(i), 22)
        return (
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={i >= redline ? '#ff4d5e' : 'rgba(255,255,255,0.65)'} strokeWidth="1" />
            <text x={tx} y={ty + 2} textAnchor="middle" fontSize="6" fontFamily="JetBrains Mono, monospace" fill={i >= redline ? '#ff4d5e' : 'rgba(255,255,255,0.7)'}>
              {i}
            </text>
          </g>
        )
      })}
      <g transform={`rotate(${needle} 50 50)`} style={{ transition: 'transform 0.12s linear' }}>
        <line x1="50" y1="50" x2="86" y2="50" stroke="#ff3d9a" strokeWidth="1.8" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="4" fill="#0d0812" stroke="#ff3d9a" strokeWidth="1.5" />
      <text x="50" y="74" textAnchor="middle" fontSize="4.2" letterSpacing="0.6" fontFamily="JetBrains Mono, monospace" fill="rgba(255,255,255,0.5)">
        {label}
      </text>
    </svg>
  )
}
