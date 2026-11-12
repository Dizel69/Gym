import { useId } from 'react'

// Holiday pictures, all drawn here as plain SVG. The banner scenes sit on a
// 200×140 board anchored to the right edge of the card; the hats are drawn on
// their own small boards and placed over the body map by BodyMap.jsx.

const useUid = () => 'h' + useId().replace(/[^a-zA-Z0-9]/g, '')

const rad = deg => (deg * Math.PI) / 180
const f = n => +n.toFixed(2)

function starPath(cx, cy, R, r, n = 5, rot = -90) {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = rad(rot + (i * 180) / n)
    const k = i % 2 ? r : R
    d += (i ? 'L' : 'M') + f(cx + k * Math.cos(a)) + ' ' + f(cy + k * Math.sin(a))
  }
  return d + 'Z'
}

// Five-point star with the two-tone bevel of the Kremlin and army stars.
export function RedStar({ cx, cy, R, rim = '#f4c95d', light = '#ff5b4f', dark = '#b3121c', className }) {
  const r = R * 0.382
  const pt = (k, deg) => [f(cx + k * Math.cos(rad(deg))), f(cy + k * Math.sin(rad(deg)))]
  const facets = []
  for (let i = 0; i < 5; i++) {
    const tip = pt(R, -90 + i * 72)
    const right = pt(r, -90 + i * 72 + 36)
    const left = pt(r, -90 + i * 72 - 36)
    facets.push(<path key={'l' + i} d={`M${cx} ${cy}L${tip}L${right}Z`} fill={light} />)
    facets.push(<path key={'d' + i} d={`M${cx} ${cy}L${left}L${tip}Z`} fill={dark} />)
  }
  return (
    <g className={className}>
      {facets}
      {rim && <path d={starPath(cx, cy, R, r)} fill="none" stroke={rim} strokeWidth={Math.max(0.8, R * 0.07)} strokeLinejoin="round" />}
    </g>
  )
}

function Glow({ cx, cy, r, color, strength = 0.5, pulse = true }) {
  const id = useUid()
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor={color} stopOpacity={strength} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className={pulse ? 'hb-glow' : ''} cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </g>
  )
}

function Twinkles({ pts, color = '#fff' }) {
  return pts.map(([x, y, r], i) => (
    <circle key={i} className="hb-tw" cx={x} cy={y} r={r} fill={color} style={{ animationDelay: (i * 0.37) % 3 + 's' }} />
  ))
}

function Burst({ x, y, r, color, delay = 0, rays = 12 }) {
  const lines = []
  for (let i = 0; i < rays; i++) {
    const a = rad((360 / rays) * i)
    lines.push(<line key={i} x1={f(x + r * 0.35 * Math.cos(a))} y1={f(y + r * 0.35 * Math.sin(a))}
      x2={f(x + r * Math.cos(a))} y2={f(y + r * Math.sin(a))} />)
    lines.push(<circle key={'c' + i} cx={f(x + r * 1.12 * Math.cos(a))} cy={f(y + r * 1.12 * Math.sin(a))} r={r * 0.06} fill={color} stroke="none" />)
  }
  return (
    <g className="hb-burst" stroke={color} strokeWidth={Math.max(1, r * 0.07)} strokeLinecap="round" style={{ animationDelay: delay + 's' }}>
      {lines}
    </g>
  )
}

function Moon({ cx, cy, r, color = '#fff4cf' }) {
  const id = useUid()
  return (
    <g>
      <mask id={id}>
        <rect x={cx - r - 2} y={cy - r - 2} width={r * 2 + 4} height={r * 2 + 4} fill="#fff" />
        <circle cx={cx + r * 0.45} cy={cy - r * 0.25} r={r * 0.9} fill="#000" />
      </mask>
      <circle cx={cx} cy={cy} r={r} fill={color} mask={`url(#${id})`} />
    </g>
  )
}

function Board({ children, className = '' }) {
  return (
    <svg className={'hb-art ' + className} viewBox="0 0 200 140" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
      {children}
    </svg>
  )
}

/* ------------------------------------------------------------ New Year -- */

const LIGHTS = ['#ff5b5b', '#ffd25a', '#5fe08f', '#6fb6ff']

function Spruce({ x, y, s = 1, lights = true, star = true }) {
  const id = useUid()
  const bulbs = [
    [-11, -73], [3, -70], [14, -76],
    [-22, -48], [-8, -44], [8, -45], [22, -50],
    [-31, -20], [-15, -16], [1, -15], [17, -17], [32, -22],
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#2f9a62" />
          <stop offset=".55" stopColor="#1e7448" />
          <stop offset="1" stopColor="#14563a" />
        </linearGradient>
      </defs>
      <rect x="-5" y="-14" width="10" height="15" rx="2" fill="#6b4226" />
      <path d="M0 -62L-41 -12Q0 -22 41 -12Z" fill={`url(#${id})`} />
      <path d="M0 -82L-31 -40Q0 -49 31 -40Z" fill={`url(#${id})`} />
      <path d="M0 -99L-21 -66Q0 -73 21 -66Z" fill={`url(#${id})`} />
      <g fill="none" stroke="#f3f7ff" strokeLinecap="round" opacity=".9">
        <path d="M-39 -13Q-20 -19 -4 -18" strokeWidth="3" />
        <path d="M8 -18Q24 -18 38 -13" strokeWidth="2.4" />
        <path d="M-29 -41Q-14 -46 0 -46" strokeWidth="2.6" />
        <path d="M-19 -67Q-9 -70 -1 -70" strokeWidth="2.2" />
      </g>
      {lights && <>
        <g fill="none" stroke="#f4d27a" strokeWidth=".8" opacity=".75">
          <path d="M-14 -73Q2 -66 16 -77" />
          <path d="M-25 -48Q0 -38 25 -51" />
          <path d="M-34 -20Q0 -10 35 -23" />
        </g>
        {bulbs.map(([bx, by], i) => (
          <circle key={i} className="hb-tw" cx={bx} cy={by} r="2.6" fill={LIGHTS[i % 4]}
            style={{ animationDelay: (i * 0.41) % 2.4 + 's' }} />
        ))}
      </>}
      {star && <>
        <Glow cx={0} cy={-101} r={16} color="#ffd25a" strength={0.7} />
        <path d={starPath(0, -101, 8, 3.4)} fill="#ffd25a" stroke="#fff1b8" strokeWidth=".8" strokeLinejoin="round" />
      </>}
    </g>
  )
}

function Gift({ x, y, w, h, color, ribbon = '#ffd25a' }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill={color} />
      <rect x={x - 1} y={y} width={w + 2} height={h * 0.28} rx="1.5" fill={color} style={{ filter: 'brightness(1.15)' }} />
      <rect x={x + w / 2 - 1.4} y={y} width="2.8" height={h} fill={ribbon} />
      <path d={`M${x + w / 2} ${y}c-5 -6 -9 -2 -6 1zM${x + w / 2} ${y}c5 -6 9 -2 6 1z`} fill="none" stroke={ribbon} strokeWidth="1.8" />
    </g>
  )
}

export function NewYearArt({ fireworks = false }) {
  return (
    <Board className="ny">
      <Twinkles pts={[[18, 20, 1], [44, 40, 1.2], [72, 14, 0.9], [96, 32, 1.1], [120, 10, 1], [150, 30, 0.8], [104, 58, 0.8], [30, 62, 0.9]]} />
      <Moon cx={176} cy={26} r={11} />
      {fireworks && <>
        <Burst x={60} y={34} r={20} color="#ffd25a" />
        <Burst x={100} y={22} r={14} color="#ff6b8a" delay={1.1} />
        <Burst x={30} y={26} r={12} color="#6fb6ff" delay={2} />
      </>}
      <path d="M0 116Q40 100 86 110T200 104V140H0Z" fill="#c4d4f2" opacity=".55" />
      <Spruce x={178} y={124} s={0.55} lights={false} star={false} />
      <Spruce x={132} y={126} s={1.04} />
      <Gift x={150} y={114} w={16} h={13} color="#d83a4a" />
      <Gift x={104} y={117} w={13} h={11} color="#2f6fd6" />
      <Gift x={118} y={121} w={10} h={8} color="#e0a52a" ribbon="#fff" />
      <path d="M0 128Q60 116 120 126T200 122V140H0Z" fill="#eef4ff" />
    </Board>
  )
}

/* --------------------------------------------------------- 23 February -- */

function Jet({ x, y, rot, s = 1 }) {
  return (
    <path transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} fill="#e6ecf2"
      d="M9 0L-2 -1.6L-4.5 -7L-6.5 -7L-5.2 -1.6L-8.4 -1.3L-10 -3.8L-11.4 -3.8L-10.4 0L-11.4 3.8L-10 3.8L-8.4 1.3L-5.2 1.6L-6.5 7L-4.5 7L-2 1.6Z" />
  )
}

export function DefenderArt() {
  const trail = 'M-6 136C30 118 58 86 92 40'
  return (
    <Board className="feb23">
      <g fill="none" strokeLinecap="round" className="hb-draw">
        <path d={trail} stroke="#ffffff" strokeWidth="5" opacity=".85" transform="translate(-12 -4)" />
        <path d={trail} stroke="#3d7bff" strokeWidth="5" opacity=".85" />
        <path d={trail} stroke="#ff4a3d" strokeWidth="5" opacity=".85" transform="translate(12 4)" />
      </g>
      <Jet x={78} y={34} rot={-52} s={1.15} />
      <Jet x={92} y={40} rot={-52} s={1.15} />
      <Jet x={106} y={46} rot={-52} s={1.15} />
      <Glow cx={150} cy={76} r={64} color="#ff5b4f" strength={0.45} />
      <RedStar cx={150} cy={76} R={46} />
      <path d="M96 140Q150 118 200 132V140Z" fill="#1d2716" opacity=".6" />
    </Board>
  )
}

/* ------------------------------------------------------------ 8 March -- */

function Tulip({ x, y, s = 1, rot = 0, c1, c2 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M-10 -3C-11 11 11 11 10 -3L6 -13L3 -4L0 -15L-3 -4L-6 -13Z" fill={c1} />
      <path d="M-4.5 -3C-4.5 9 4.5 9 4.5 -3L0 -15Z" fill={c2} />
    </g>
  )
}

function Mimosa({ x, y, s = 1, rot = 0 }) {
  const balls = [[0, 0], [5, -4], [9, 1], [4, 5], [-4, 4], [-6, -3], [12, -5], [15, 2], [8, 9], [-1, 10], [-9, 9]]
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M-14 16C-4 6 6 -2 18 -6" stroke="#6f9a3f" strokeWidth="1.2" fill="none" />
      {balls.map(([bx, by], i) => <circle key={i} cx={bx} cy={by} r={i % 3 ? 2.6 : 3.1} fill={i % 2 ? '#ffd93b' : '#ffe76a'} />)}
    </g>
  )
}

export function TulipArt() {
  return (
    <Board className="mar8">
      <g fill="none" stroke="#4f9e4f" strokeWidth="2.6" strokeLinecap="round">
        <path d="M124 118C120 90 106 70 100 52" />
        <path d="M128 118C130 86 132 64 134 40" />
        <path d="M132 118C142 92 156 74 166 58" />
      </g>
      <path d="M118 112C98 96 92 80 96 66C106 80 112 92 122 104Z" fill="#5fae5a" />
      <path d="M136 112C158 98 168 84 168 72C156 82 146 94 134 104Z" fill="#4f9e4f" />
      <Mimosa x={88} y={78} s={1.1} rot={-18} />
      <Mimosa x={168} y={86} s={1} rot={20} />
      <Tulip x={100} y={52} s={1.35} rot={-14} c1="#ff5f8f" c2="#ff9dbd" />
      <Tulip x={134} y={40} s={1.5} c1="#ff3d5e" c2="#ff8094" />
      <Tulip x={166} y={58} s={1.3} rot={16} c1="#ffe3ea" c2="#ffffff" />
      <path d="M106 102L154 102L136 140L124 140Z" fill="#f1d3b3" />
      <path d="M106 102L130 108L154 102L148 116L112 116Z" fill="#e6bf98" />
      <g fill="#ff5f8f">
        <path d="M130 112c-10 -8 -16 -2 -10 4zM130 112c10 -8 16 -2 10 4z" />
        <path d="M128 113L122 128L126 127L130 116L134 127L138 128L132 113Z" />
        <circle cx="130" cy="112" r="3" fill="#ff86aa" />
      </g>
      <path className="hb-float" d="M60 40c-3 -4 -8 0 -4 4l4 4 4 -4c4 -4 -1 -8 -4 -4z" fill="#ff9dbd" opacity=".75" />
      <path className="hb-float" style={{ animationDelay: '-1.6s' }} d="M182 22c-2 -3 -6 0 -3 3l3 3 3 -3c3 -3 -1 -6 -3 -3z" fill="#ffd3e0" opacity=".7" />
    </Board>
  )
}

/* -------------------------------------------------- Spring and Labour -- */

function Blossom({ x, y, r = 6, c = '#fff', core = '#ffcf4a', rot = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map(a => (
        <ellipse key={a} cx="0" cy={-r * 0.62} rx={r * 0.5} ry={r * 0.66} fill={c} transform={`rotate(${a})`} />
      ))}
      <circle r={r * 0.28} fill={core} />
    </g>
  )
}

function Butterfly({ x, y, s = 1, c1 = '#ffb347', c2 = '#ff7a59', delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="hb-flutter" style={{ animationDelay: delay + 's' }}>
        <g className="hb-flap">
          <ellipse cx="-5" cy="-3" rx="5" ry="6" fill={c1} transform="rotate(-20 -5 -3)" />
          <ellipse cx="5" cy="-3" rx="5" ry="6" fill={c1} transform="rotate(20 5 -3)" />
          <ellipse cx="-4" cy="5" rx="3.4" ry="4" fill={c2} />
          <ellipse cx="4" cy="5" rx="3.4" ry="4" fill={c2} />
        </g>
        <rect x="-0.8" y="-6" width="1.6" height="13" rx=".8" fill="#3b2a1e" />
      </g>
    </g>
  )
}

export function SpringArt() {
  const flowers = [[150, 30, 8], [172, 46, 7], [128, 48, 7.5], [186, 22, 6], [108, 64, 6.5], [160, 64, 6], [138, 18, 5.5]]
  return (
    <Board className="spring">
      <Glow cx={52} cy={30} r={40} color="#fff6c2" strength={0.9} pulse={false} />
      <circle cx="52" cy="30" r="14" fill="#fff3b0" />
      <g fill="none" stroke="#6b4a33" strokeLinecap="round">
        <path d="M206 4C176 20 144 34 98 72" strokeWidth="4" />
        <path d="M160 28C164 40 168 50 170 60" strokeWidth="2.4" />
        <path d="M134 44C128 34 124 26 118 20" strokeWidth="2" />
      </g>
      {[[118, 60, -30], [146, 40, 30], [180, 30, -10], [166, 54, 50], [126, 34, -60]].map(([lx, ly, a], i) => (
        <ellipse key={i} cx={lx} cy={ly} rx="7" ry="3" fill={i % 2 ? '#7cc576' : '#5fae5a'} transform={`rotate(${a} ${lx} ${ly})`} />
      ))}
      {flowers.map(([x, y, r], i) => <Blossom key={i} x={x} y={y} r={r} c={i % 3 === 1 ? '#ffd6e5' : '#ffffff'} rot={i * 17} />)}
      <path d="M0 124Q50 112 110 120T200 116V140H0Z" fill="#3c8f4d" />
      <path d="M0 132Q70 122 140 130T200 128V140H0Z" fill="#4fa95c" />
      {[[20, 122, '#ffffff'], [44, 126, '#ffd93b'], [70, 120, '#ff8fb3'], [96, 124, '#ffffff'], [124, 122, '#c59bff'], [150, 126, '#ffd93b'], [178, 120, '#ffffff']].map(([x, y, c], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 10} stroke="#2f7a3e" strokeWidth="1.2" />
          <Blossom x={x} y={y} r={4.2} c={c} core={c === '#ffd93b' ? '#e08a00' : '#ffcf4a'} />
        </g>
      ))}
      <Butterfly x={78} y={62} s={1.2} />
      <Butterfly x={40} y={86} s={0.9} c1="#8ec5ff" c2="#5f8dff" delay={-1.3} />
    </Board>
  )
}

/* --------------------------------------------------------------- 9 May -- */

// St George ribbon: five stripes, black outside, built from stacked strokes.
function Ribbon({ d, w = 14 }) {
  return <>
    <path d={d} stroke="#151515" strokeWidth={w} />
    <path d={d} stroke="#f28c28" strokeWidth={w * 0.8} />
    <path d={d} stroke="#151515" strokeWidth={w * 0.6} />
    <path d={d} stroke="#f28c28" strokeWidth={w * 0.4} />
    <path d={d} stroke="#151515" strokeWidth={w * 0.2} />
  </>
}

function Carnation({ x, y, r = 9, rot = 0 }) {
  let outer = ''
  let inner = ''
  for (let i = 0; i < 18; i++) {
    const a = rad(-180 + (i * 180) / 17)
    const k = i % 2 ? r * 0.8 : r
    outer += (i ? 'L' : 'M') + f(k * Math.cos(a)) + ' ' + f(k * Math.sin(a) * 0.9)
    const k2 = (i % 2 ? r * 0.55 : r * 0.7)
    inner += (i ? 'L' : 'M') + f(k2 * Math.cos(a)) + ' ' + f(k2 * Math.sin(a) * 0.8 - 1)
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M-3 2Q0 ${r} 3 2Z`} fill="#3f7d3a" />
      <path d={outer + `Q0 ${r * 0.5} ${-r} 0Z`} fill="#c8102e" />
      <path d={inner + 'Z'} fill="#ff3347" />
    </g>
  )
}

export function VictoryArt() {
  return (
    <Board className="may9">
      <Burst x={96} y={26} r={16} color="#ffd25a" />
      <Burst x={124} y={12} r={10} color="#ff5b4f" delay={1.3} />
      <Burst x={78} y={60} r={9} color="#ffffff" delay={2.2} />
      <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
        <Ribbon w={19} d="M112 146C120 116 136 92 152 66C166 44 162 18 144 16C124 14 122 40 136 58" />
        <Ribbon w={19} d="M136 58C150 80 168 108 184 146" />
      </g>
      <g fill="none" stroke="#3f7d3a" strokeWidth="2.2" strokeLinecap="round">
        <path d="M92 142C94 122 96 110 98 98" />
        <path d="M100 142C106 124 112 114 120 104" />
        <path d="M86 142C84 126 80 118 76 110" />
      </g>
      <Carnation x={98} y={96} r={11} rot={-8} />
      <Carnation x={121} y={102} r={10} rot={14} />
      <Carnation x={75} y={108} r={9} rot={-24} />
      <RedStar cx={180} cy={28} R={15} rim="#fff1b8" light="#ffd25a" dark="#d99a1e" />
    </Board>
  )
}

/* -------------------------------------------------------------- 12 June -- */

export function RussiaArt() {
  const id = useUid()
  const band = k => {
    const o = k * 17
    return `M60 ${26 + o}C88 ${14 + o} 116 ${40 + o} 176 ${22 + o}L176 ${39 + o}C116 ${57 + o} 88 ${31 + o} 60 ${43 + o}Z`
  }
  return (
    <Board className="jun12">
      <Burst x={30} y={30} r={16} color="#ffffff" />
      <Burst x={180} y={110} r={12} color="#ff4a3d" delay={1.4} />
      <Burst x={34} y={96} r={11} color="#6fa2ff" delay={2.3} />
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".18" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".55" stopColor="#000" stopOpacity=".16" />
          <stop offset=".8" stopColor="#fff" stopOpacity=".1" />
          <stop offset="1" stopColor="#000" stopOpacity=".2" />
        </linearGradient>
      </defs>
      <rect x="56" y="14" width="3.4" height="126" rx="1.7" fill="#c9ccd3" />
      <circle cx="57.7" cy="13" r="4" fill="#f4c95d" />
      <g className="hb-wave">
        <path d={band(0)} fill="#ffffff" />
        <path d={band(1)} fill="#1c57c9" />
        <path d={band(2)} fill="#d8282e" />
        <path d={`M60 26C88 14 116 40 176 22L176 73C116 91 88 65 60 77Z`} fill={`url(#${id})`} />
      </g>
    </Board>
  )
}

/* ---------------------------------------------- Equinoxes and solstices -- */

function Sun({ cx, cy, r, spin = true }) {
  const id = useUid()
  const rays = []
  for (let i = 0; i < 12; i++) {
    const a = rad(i * 30)
    rays.push(<line key={i} x1={f(cx + r * 1.3 * Math.cos(a))} y1={f(cy + r * 1.3 * Math.sin(a))}
      x2={f(cx + r * 1.75 * Math.cos(a))} y2={f(cy + r * 1.75 * Math.sin(a))} />)
  }
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="#fff6c4" />
          <stop offset=".7" stopColor="#ffd34d" />
          <stop offset="1" stopColor="#ffb02e" />
        </radialGradient>
      </defs>
      {spin && <Glow cx={cx} cy={cy} r={r * 2.6} color="#fff1a8" strength={0.55} pulse={false} />}
      <g className={spin ? 'hb-spin' : ''} stroke="#ffd34d" strokeWidth={r * 0.16} strokeLinecap="round">{rays}</g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </g>
  )
}

export function SolsticeArt() {
  return (
    <Board className="solstice">
      <path d="M30 124Q110 -20 196 124" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.4" strokeDasharray="3 5" />
      <Sun cx={113} cy={36} r={15} />
      <path d="M0 118Q60 106 120 116T200 110V140H0Z" fill="#3f8f4d" />
      <path d="M0 128Q80 118 150 128T200 126V140H0Z" fill="#57ab5c" />
      {[[30, 112], [168, 106], [184, 114]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <rect x="-1" y="0" width="2" height="10" fill="#5a3b26" />
          <circle cx="0" cy="-3" r="7" fill="#2f7a3e" />
        </g>
      ))}
    </Board>
  )
}

function Maple({ x, y, s = 1, c = '#e8622a', className, style }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path className={className} style={style} fill={c}
        d="M0 -10L2 -5L6 -7L5 -2L10 -1L6 2L7 6L2 4L0.6 9L0.6 12L-0.6 12L-0.6 9L-2 4L-7 6L-6 2L-10 -1L-5 -2L-6 -7L-2 -5Z" />
    </g>
  )
}

export function EquinoxArt({ turn }) {
  const id = useUid()
  const autumn = turn === 'autumn'
  return (
    <Board className={'equinox ' + (autumn ? 'autumn' : 'spring')}>
      <defs>
        <clipPath id={id}><circle cx="140" cy="72" r="50" /></clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect x="88" y="20" width="52" height="104" fill="#7cc2ff" />
        <rect x="140" y="20" width="52" height="104" fill="#16224a" />
        <Sun cx={116} cy={56} r={11} spin={false} />
        <Moon cx={166} cy={52} r={10} />
        <Twinkles pts={[[178, 76, 1], [152, 34, 1.1], [184, 44, 0.9], [160, 84, 0.8]]} />
        <path d="M88 100Q140 88 192 100V124H88Z" fill={autumn ? '#c96a28' : '#4fa95c'} />
        <path d="M140 92V124H192V100Q166 92 140 92Z" fill="#000" opacity=".35" />
      </g>
      <circle cx="140" cy="72" r="50" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4" />
      <line x1="140" y1="16" x2="140" y2="128" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" strokeDasharray="2 3" />
      {autumn ? <>
        <Maple x={56} y={40} s={1.3} className="hb-leaf" />
        <Maple x={74} y={92} s={1} c="#f2a33a" className="hb-leaf" style={{ animationDelay: '-2s' }} />
        <Maple x={196} y={124} s={0.9} c="#c9412a" className="hb-leaf" style={{ animationDelay: '-3.4s' }} />
      </> : <>
        <g transform="translate(64 112)">
          <path d="M0 0C0 -12 2 -20 6 -26" stroke="#5fae5a" strokeWidth="2" fill="none" />
          <ellipse cx="11" cy="-28" rx="7" ry="3.4" fill="#7cc576" transform="rotate(-30 11 -28)" />
          <ellipse cx="0" cy="-24" rx="6" ry="3" fill="#5fae5a" transform="rotate(40 0 -24)" />
        </g>
        <Blossom x={50} y={44} r={6} c="#ffd6e5" />
      </>}
    </Board>
  )
}

/* ----------------------------------------------------------- Halloween -- */

// Ribbed pumpkin. A face only where it faces the viewer.
export function Pumpkin({ x, y, width, height, face = true, glow = true, className = 'pumpkin' }) {
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 120 100" overflow="visible" aria-hidden="true">
      <path d="M56 24C55 13 60 5 69 2L72 7C66 10 64 16 65 24Z" fill="#4e7a2c" />
      <ellipse cx="30" cy="60" rx="28" ry="34" fill="#c95f12" />
      <ellipse cx="90" cy="60" rx="28" ry="34" fill="#c95f12" />
      <ellipse cx="45" cy="60" rx="25" ry="38" fill="#e2761b" />
      <ellipse cx="75" cy="60" rx="25" ry="38" fill="#e2761b" />
      <ellipse cx="60" cy="60" rx="19" ry="39" fill="#f39233" />
      {face && <g className={glow ? 'hb-flicker' : ''} fill="#ffd45e">
        <path d="M28 54L46 54L37 39Z" />
        <path d="M74 54L92 54L83 39Z" />
        <path d="M54 66L66 66L60 57Z" />
        <path d="M24 70Q60 96 96 70Q90 78 84 76L80 82L73 77Q60 82 47 77L40 82L36 76Q30 78 24 70Z" />
      </g>}
    </svg>
  )
}

function Bat({ x, y, s = 1, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="hb-flap" style={{ animationDelay: delay + 's' }}>
        <path fill="#140b1c" d="M0 -2C-3 -7 -9 -8 -16 -6C-13 -4 -13 -1 -17 1C-11 0 -7 2 -5 5C-3 3 -1 3 0 5C1 3 3 3 5 5C7 2 11 0 17 1C13 -1 13 -4 16 -6C9 -8 3 -7 0 -2Z" />
        <path fill="#140b1c" d="M-2 -3L-2.6 -6L-0.8 -4L0.8 -4L2.6 -6L2 -3Z" />
      </g>
    </g>
  )
}

export function HalloweenArt() {
  return (
    <Board className="halloween">
      <Glow cx={150} cy={42} r={50} color="#f6e7b0" strength={0.28} />
      <circle cx="150" cy="42" r="28" fill="#f3e2a6" />
      <circle cx="140" cy="34" r="5" fill="#e2cd88" />
      <circle cx="160" cy="50" r="3.6" fill="#e2cd88" />
      <circle cx="146" cy="56" r="2.6" fill="#e2cd88" />
      <path d="M86 140C90 110 92 86 88 62C86 50 80 40 72 34M89 84C98 74 108 70 118 70M88 66C80 60 76 52 76 44M74 36C70 30 64 28 58 30"
        fill="none" stroke="#120a19" strokeWidth="3.2" strokeLinecap="round" />
      <Bat x={128} y={30} s={0.9} />
      <Bat x={172} y={22} s={0.7} delay={-0.3} />
      <Bat x={110} y={52} s={0.6} delay={-0.15} />
      <path d="M60 128Q120 112 200 120V140H60Z" fill="#120a19" />
      <Pumpkin x={106} y={104} width={36} height={30} />
      <Pumpkin x={146} y={96} width={48} height={40} />
      <g className="hb-bob">
        <line x1="40" y1="0" x2="40" y2="44" stroke="#d9d2ea" strokeOpacity=".6" strokeWidth=".8" />
        <g transform="translate(40 48)" fill="#140b1c" stroke="#140b1c" strokeWidth="1.1" strokeLinecap="round">
          <ellipse rx="4.4" ry="5.2" />
          <circle cy="-6" r="2.8" />
          <path d="M-3 -2L-9 -6L-11 -1M-3 1L-10 1L-12 6M-3 3L-8 7L-9 11M3 -2L9 -6L11 -1M3 1L10 1L12 6M3 3L8 7L9 11" fill="none" />
        </g>
      </g>
    </Board>
  )
}

/* ------------------------------------------------------- 4 November -- */

export function UnityArt() {
  const people = [
    [84, '#ffb44c'], [104, '#ff6b6b'], [124, '#7cc2ff'], [144, '#8fd694'], [164, '#c59bff'],
  ]
  return (
    <Board className="unity">
      <g transform="translate(188 0)">
        <rect x="-9" y="82" width="18" height="58" fill="#8c2a2a" />
        <rect x="-7" y="58" width="14" height="26" fill="#a53434" />
        <rect x="-5" y="44" width="10" height="16" fill="#b94040" />
        <path d="M-6 46L0 18L6 46Z" fill="#2f6e4e" />
        <rect x="-4" y="66" width="8" height="8" rx="4" fill="#f4e6c2" />
        <RedStar cx={0} cy={14} R={6} rim="" />
      </g>
      <g fill="none" strokeLinecap="round">
        <path d="M66 106Q124 6 182 106" stroke="#ffffff" strokeWidth="5" />
        <path d="M74 106Q124 16 174 106" stroke="#2f6fe0" strokeWidth="5" />
        <path d="M82 106Q124 26 166 106" stroke="#e0322b" strokeWidth="5" />
      </g>
      {people.map(([x, c], i) => (
        <g key={i}>
          <circle cx={x} cy={101 - (i % 2) * 2} r="6.5" fill="#f1d9b5" />
          <path d={`M${x - 10} 140L${x - 8} 116Q${x} ${110 - (i % 2) * 2} ${x + 8} 116L${x + 10} 140Z`} fill={c} />
        </g>
      ))}
    </Board>
  )
}

/* ---------------------------------------------------------------- hats -- */
// Each hat is drawn on its own board. `back` is the view from behind.

export function SantaHat({ x, y, width, height, className = 'hat' }) {
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 100 90" overflow="visible" aria-hidden="true">
      <path d="M14 66C16 38 34 12 60 10C76 9 88 20 92 36C86 33 80 32 76 34C82 44 86 56 86 66Z" fill="#d8323e" />
      <path d="M60 10C76 9 88 20 92 36C86 33 80 32 76 34C70 24 64 16 60 10Z" fill="#a81f2b" />
      <path d="M50 66C54 46 62 28 72 20" fill="none" stroke="#a81f2b" strokeWidth="3" opacity=".5" />
      <circle cx="91" cy="39" r="9.5" fill="#f7f7f9" />
      <circle cx="93.5" cy="42" r="5" fill="#dfe3ea" />
      <rect x="6" y="60" width="88" height="22" rx="11" fill="#f7f7f9" />
      <rect x="10" y="72" width="80" height="9" rx="4.5" fill="#dfe3ea" />
    </svg>
  )
}

// Snegurochka's kokoshnik: a tall blue arch, white rim, pearls and a snowflake.
export function Kokoshnik({ x, y, width, height, back = false, className = 'hat' }) {
  const id = useUid()
  const segs = [
    [[24, 74], [10, 64], [2, 48], [6, 34]],
    [[6, 34], [10, 18], [36, 14], [50, 2]],
    [[50, 2], [64, 14], [90, 18], [94, 34]],
    [[94, 34], [98, 48], [90, 64], [76, 74]],
  ]
  const at = ([p0, p1, p2, p3], t) => {
    const u = 1 - t
    return [0, 1].map(k => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k])
  }
  const pearls = []
  segs.forEach((s, si) => {
    for (let i = si ? 0 : 1; i < 4; i++) {
      const [px, py] = at(s, i / 4)
      pearls.push(<circle key={si + '-' + i} cx={f(50 + (px - 50) * 0.84)} cy={f(46 + (py - 46) * 0.84)} r="2.3" fill="#ffffff" />)
    }
  })
  const flake = []
  for (let i = 0; i < 6; i++) {
    flake.push(<g key={i} transform={`rotate(${i * 60} 50 42)`}>
      <line x1="50" y1="42" x2="50" y2="28" />
      <path d="M46 32L50 35L54 32" fill="none" />
    </g>)
  }
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 100 82" overflow="visible" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fcaff" />
          <stop offset="1" stopColor="#2c63c4" />
        </linearGradient>
      </defs>
      <path d="M24 74C10 64 2 48 6 34C10 18 36 14 50 2C64 14 90 18 94 34C98 48 90 64 76 74Z" fill={`url(#${id})`}
        stroke="#e9f4ff" strokeWidth="2.2" strokeLinejoin="round" />
      {pearls}
      {!back && <g stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round">{flake}</g>}
      {!back && <circle cx="50" cy="42" r="3" fill="#ffffff" />}
      <rect x="20" y="70" width="60" height="10" rx="5" fill="#e9f4ff" />
      {[28, 36, 44, 52, 60, 68].map(px => <circle key={px} cx={px + 2} cy="81" r="2.6" fill="#e9f4ff" />)}
    </svg>
  )
}

export function Ushanka({ x, y, width, height, back = false, className = 'hat' }) {
  const fur = []
  for (let i = 0; i < 12; i++) fur.push(<path key={i} d={`M${14 + i * 6.4} ${44 + (i % 2) * 3}l2 6`} />)
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 100 96" overflow="visible" aria-hidden="true">
      <path d="M10 46C1 58 2 80 10 92C16 95 22 93 25 88L27 52Z" fill="#6e5948" />
      <path d="M90 46C99 58 98 80 90 92C84 95 78 93 75 88L73 52Z" fill="#5e4b3c" />
      <path d="M14 54C12 22 30 8 50 8C70 8 88 22 86 54Z" fill="#4a5a34" />
      <path d="M50 8C70 8 88 22 86 54L66 54C66 30 60 14 50 8Z" fill="#3c4a2a" />
      <rect x="7" y="38" width="86" height="27" rx="13.5" fill="#7d6653" />
      <g stroke="#9c8571" strokeWidth="1.4" strokeLinecap="round">{fur}</g>
      {!back && <RedStar cx={50} cy={51} R={9.5} rim="#f4c95d" />}
    </svg>
  )
}

export function Pilotka({ x, y, width, height, back = false, className = 'hat' }) {
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 100 52" overflow="visible" aria-hidden="true">
      <g transform="rotate(-5 50 40)">
        <path d="M4 44L12 16C30 6 70 6 88 16L96 44Z" fill="#66763f" />
        <path d="M12 16C30 22 70 22 88 16" fill="none" stroke="#4c5a2d" strokeWidth="2" />
        <path d="M6 36L94 36L96 44L4 44Z" fill="#55642f" />
        {!back && <RedStar cx={50} cy={28} R={7.5} rim="#f4c95d" />}
      </g>
    </svg>
  )
}

const WREATHS = {
  mar8: ['#ff5f8f', '#ffd93b', '#ffffff', '#ff9dbd'],
  spring: ['#ffffff', '#ffd6e5', '#c59bff', '#ffe680'],
}

export function Wreath({ x, y, width, height, back = false, palette = 'mar8', className = 'hat' }) {
  const colors = WREATHS[palette] || WREATHS.mar8
  const at = deg => [f(50 + 46 * Math.cos(rad(deg))), f(56 + 38 * Math.sin(rad(deg)))]
  const leaves = []
  for (let deg = 188; deg <= 352; deg += 12) {
    const [lx, ly] = at(deg)
    leaves.push(<ellipse key={deg} cx={lx} cy={ly} rx="6" ry="2.6" fill={deg % 24 ? '#5fae5a' : '#3f8f4d'}
      transform={`rotate(${deg + 90 + (deg % 24 ? 30 : -30)} ${lx} ${ly})`} />)
  }
  const flowers = [198, 226, 254, 270, 286, 314, 342].map((deg, i) => {
    const [fx, fy] = at(deg)
    return <Blossom key={deg} x={fx} y={fy} r={deg === 270 ? 9 : 7} c={colors[i % colors.length]} core={colors[i % colors.length] === '#ffd93b' ? '#e08a00' : '#ffcf4a'} rot={i * 23} />
  })
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 100 60" overflow="visible" aria-hidden="true">
      {back && <g fill="none" strokeWidth="3.2" strokeLinecap="round">
        <path d="M44 54C40 80 46 104 38 136" stroke={colors[0]} />
        <path d="M50 54C52 84 48 110 54 142" stroke={colors[2] === '#ffffff' ? '#7cc2ff' : colors[2]} />
        <path d="M56 54C62 82 58 104 66 132" stroke={colors[1]} />
      </g>}
      {leaves}
      {flowers}
    </svg>
  )
}

export function StrawHat({ x, y, width, height, className = 'hat' }) {
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 120 64" overflow="visible" aria-hidden="true">
      <ellipse cx="60" cy="52" rx="58" ry="11" fill="#c9a24e" />
      <ellipse cx="60" cy="50" rx="58" ry="11" fill="#e8c77e" />
      <path d="M32 50C30 22 44 12 60 12C76 12 90 22 88 50Z" fill="#dcb565" />
      <g stroke="#c9a24e" strokeWidth="1" fill="none" opacity=".8">
        <path d="M36 30C50 26 70 26 84 30" />
        <path d="M33 22C48 18 72 18 86 22" opacity=".6" />
      </g>
      <path d="M31 39C50 45 70 45 89 39L89 48C70 54 50 54 31 48Z" fill="#3f8f5a" />
      <Blossom x={80} y={44} r={6.5} />
    </svg>
  )
}

export function WitchHat({ x, y, width, height, className = 'hat' }) {
  return (
    <svg className={className} x={x} y={y} width={width} height={height} viewBox="0 0 100 90" overflow="visible" aria-hidden="true">
      <ellipse cx="50" cy="78" rx="48" ry="10" fill="#3a2350" />
      <path d="M28 78C34 52 40 30 64 4C60 26 66 50 74 78Z" fill="#53307a" />
      <path d="M29 70C46 74 58 74 73 70L74 77C58 81 44 81 28 77Z" fill="#f08a24" />
      <rect x="45" y="70" width="9" height="8" rx="1.5" fill="none" stroke="#ffd45e" strokeWidth="1.6" />
    </svg>
  )
}

/* ------------------------------------------------------- small marks -- */
// Badges on the Start button: 20×20 boards.

export function StartBadge({ id, turn }) {
  const box = c => <svg className="start-badge" viewBox="0 0 20 20" aria-hidden="true">{c}</svg>
  if (id === 'feb23') return box(<RedStar cx={10} cy={10.6} R={9} rim="#f4c95d" />)
  if (id === 'may9') return box(<RedStar cx={10} cy={10.6} R={9} rim="#fff1b8" light="#ffd25a" dark="#d99a1e" />)
  if (id === 'mar8') return box(<Mimosa x={9} y={7} s={0.58} />)
  if (id === 'spring') return box(<Blossom x={10} y={10} r={8.5} c="#ffffff" />)
  if (id === 'solstice' || (id === 'equinox' && turn === 'spring')) return box(<Sun cx={10} cy={10} r={4.6} spin={false} />)
  if (id === 'equinox') return box(<Maple x={10} y={9} s={0.78} />)
  if (id === 'unity') return box(<g><rect x="2" y="4" width="16" height="4" fill="#fff" /><rect x="2" y="8" width="16" height="4" fill="#2f6fe0" /><rect x="2" y="12" width="16" height="4" fill="#e0322b" /></g>)
  return null
}
