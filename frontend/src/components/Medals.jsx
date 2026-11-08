import { t, dateLocale } from '../lib/i18n.js'
import { fmtNum, fmtVol } from '../lib/format.js'
import { medalCase } from '../lib/medals.js'
import { MEDAL_FROM, MEDAL_TO, medalMonths, monthMedal } from '../lib/medal-art.js'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { useUI } from '../store/useUI.js'
import Icon from './Icon.jsx'

const LB_TO_KG = 0.45359237
const LABEL = { workouts: 'Workouts', volume: 'Volume', records: 'PRs' }
const METAL = ['#C4894A', '#D7DEE6', '#E2B657', '#F2D48A']
const DEEP = ['#8A5A2B', '#8E99A6', '#A07E2E', '#C4963A']

function star(outer, inner) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + i * Math.PI / 5
    pts.push(Math.cos(a) * r + ',' + Math.sin(a) * r)
  }
  return pts.join(' ')
}

function Glyph({ kind }) {
  if (kind === 'volume') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M-14 0h28" />
        <path d="M-12 -6v12M-7 -9v18M7 -9v18M12 -6v12" />
      </g>
    )
  }
  if (kind === 'records') return <polygon points={star(11, 4.6)} fill="currentColor" />
  return (
    <g fill="currentColor">
      <rect x="-12" y="-2" width="5" height="12" rx="1.2" />
      <rect x="-2.5" y="-8" width="5" height="18" rx="1.2" />
      <rect x="7" y="-14" width="5" height="24" rx="1.2" />
    </g>
  )
}

function ring(n, r, turn = -Math.PI / 2) {
  return Array.from({ length: n }, (_, i) => {
    const a = turn + i * 2 * Math.PI / n
    return (32 + Math.cos(a) * r).toFixed(1) + ',' + (32 + Math.sin(a) * r).toFixed(1)
  }).join(' ')
}

function Frame({ n, metal }) {
  const ink = { fill: '#141414', stroke: metal, strokeWidth: 2 }
  if (n === 1) return <polygon points={ring(6, 26)} {...ink} />
  if (n === 2) return <path d="M32 6 54 16 V36 C54 52 32 62 32 62 32 62 10 52 10 36 V16 Z" {...ink} />
  if (n === 3) return <polygon points={ring(4, 28)} {...ink} />
  if (n === 4) return <polygon points={Array.from({ length: 16 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 8
    const r = i % 2 ? 21 : 27
    return (32 + Math.cos(a) * r).toFixed(1) + ',' + (32 + Math.sin(a) * r).toFixed(1)
  }).join(' ')} {...ink} />
  return <circle cx="32" cy="32" r="26" {...ink} />
}

export function ShelfMedal({ ym }) {
  const art = monthMedal(ym)
  const metal = METAL[art.metal]
  return (
    <div className="medal-face" style={{ color: metal }}>
      <svg className="medal-frame" viewBox="0 0 64 64" aria-hidden="true">
        <Frame n={art.frame} metal={metal} />
      </svg>
      <Icon name={art.icon} />
    </div>
  )
}

function Face({ kind, tier }) {
  const stage = Math.min(4, Math.max(1, tier || 1))
  const metal = METAL[(stage - 1) % 4]
  const deep = DEEP[(stage - 1) % 4]
  if (!kind) {
    return (
      <svg viewBox="0 0 72 88" aria-hidden="true">
        <circle cx="36" cy="36" r="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 3" opacity="0.4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 72 88" aria-hidden="true" style={{ color: metal }}>
      {stage >= 2 && <>
        <polygon points="24,46 33,46 30,80 20,70" fill={deep} />
        <polygon points="48,46 39,46 42,80 52,70" fill={deep} />
      </>}
      {stage === 3 && (
        <g fill="none" stroke={metal} strokeWidth="1.4" strokeLinecap="round">
          <path d="M12 42c2-16 12-28 24-32" />
          <path d="M60 42c-2-16-12-28-24-32" />
          <path d="M14 36l-3-1M17 28l-3-3M22 21l-2-3" />
          <path d="M58 36l3-1M55 28l3-3M50 21l2-3" />
        </g>
      )}
      {stage === 4 ? <>
        <path d="M36 16 L56 24 V42 C56 54 36 66 36 66 C36 66 16 54 16 42 V24 Z" fill="#141414" stroke={metal} strokeWidth="2" />
        <path d="M26 22 L30 12 L36 18 L42 12 L46 22" fill={metal} />
      </> : <>
        <circle cx="36" cy="36" r="24" fill="#141414" stroke={metal} strokeWidth="2.4" />
        <circle cx="36" cy="36" r="18" fill="none" stroke={metal} strokeWidth="1" opacity="0.55" />
      </>}
      <g transform={'translate(36 ' + (stage === 4 ? 42 : 36) + ') scale(' + (stage === 4 ? 0.82 : 1) + ')'}>
        <Glyph kind={kind} />
      </g>
    </svg>
  )
}

function amount(n, unit) {
  const kg = unit === 'lb' ? n * LB_TO_KG : n
  if (kg >= 1000) {
    const tonnes = Math.round(kg / 100) / 10
    return t('{0} t', tonnes.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }))
  }
  return fmtVol(n, unit)
}

function monthName(ym, short) {
  const [y, m] = ym.split('-').map(Number)
  const name = new Date(y, m - 1, 1).toLocaleDateString(dateLocale(), { month: short ? 'short' : 'long' })
  return name + ' ' + y
}

function MonthMedals({ shelf }) {
  if (!shelf.length) return <div className="dim small">{t('Clear every goal in a month and its medal stays here.')}</div>
  return (
    <div className="rewards-shelf">
      {shelf.map(medal => (
        <div key={medal.ym} className="medal">
          <ShelfMedal ym={medal.ym} />
          <div className="sub">{monthName(medal.ym, true)}</div>
        </div>
      ))}
    </div>
  )
}

export default function Rewards({ S }) {
  const box = medalCase(S)
  if (!box) return null
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  const open = () => useUI.getState().openSheet(() => (
    <>
      <h3>{t('Months you cleared')}</h3>
      <MonthMedals shelf={box.shelf} />
    </>
  ))
  return (
    <div className="card rewards" {...tappable(open)}>
      <div className="row between">
        <h2 style={{ margin: 0 }}>{t('Rewards')}</h2>
        <Icon name="chevronRight" className="chev" />
      </div>
      <div className="dim small" style={{ marginTop: 2 }}>{t('A medal changes when a later month beats it.')}</div>
      <div className="rewards-top">
        {box.champions.map((medal, i) => {
          const id = medal?.id || ['workouts', 'volume', 'records'][i]
          const value = medal ? (id === 'volume' ? amount(medal.value, unit) : fmtNum(medal.value)) : '—'
          return (
            <div key={id} className="medal">
              <Face kind={medal ? id : ''} tier={medal?.tier || 0} />
              <div className="cap">{value}</div>
              <div className="sub">{t(LABEL[id])}</div>
              <div className="sub">{medal ? monthName(medal.ym, false) : t('Not yet')}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function medalPreviewOn() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('medals') === 'all'
}

export function MedalGallery() {
  const years = []
  for (let y = MEDAL_FROM; y <= MEDAL_TO; y++) years.push(y)
  return (
    <>
      <div className="hdr"><div><h1>{t('Monthly medals')}</h1><div className="sub">{t('One picture for every month, through 2030.')}</div></div></div>
      {years.map(year => (
        <section key={year}>
          <h2 className="medal-year">{year}</h2>
          <div className="medal-gallery">
            {medalMonths(year, year).map(ym => (
              <div key={ym} className="medal">
                <ShelfMedal ym={ym} />
                <div className="sub">{monthName(ym, true)}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
