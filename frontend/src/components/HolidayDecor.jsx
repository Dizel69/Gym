import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, getLang, dateLocale } from '../lib/i18n.js'
import {
  activeHoliday, adventDays, dayLength, dayLengthChange, daysToNewYear, doorState,
  isoOfDate, previewDate, winterSolsticeIso,
} from '../lib/holidays.js'
import {
  DefenderArt, EquinoxArt, HalloweenArt, NewYearArt, Pilotka, RussiaArt, SantaHat, SolsticeArt,
  SpringArt, StartBadge, StrawHat, TulipArt, UnityArt, Ushanka, VictoryArt, WitchHat, Wreath,
} from './holiday-art.jsx'

const previewBus = new Set()

export function setPreviewDay(iso) {
  const url = new URL(window.location.href)
  url.searchParams.set('decorDay', iso)
  history.pushState({}, '', url)
  previewBus.forEach(fn => fn())
}

export function useHoliday() {
  const mode = useStore(s => s.S.holidayMode)
  const [, setTick] = useState(0)
  useEffect(() => {
    const fn = () => setTick(n => n + 1)
    previewBus.add(fn)
    window.addEventListener('popstate', fn)
    return () => {
      previewBus.delete(fn)
      window.removeEventListener('popstate', fn)
    }
  }, [])
  const preview = previewDate()
  const theme = activeHoliday(new Date(), mode || 'auto')
  return { theme, preview }
}

// Dates a reviewer can jump between. Ordinary use never shows this strip:
// it appears only while ?decorDay= is in the address.
const PREVIEW_STOPS = [
  ['2026-12-20', 'New Year'],
  ['2026-12-21', 'Longest night'],
  ['2027-01-03', 'January'],
  ['2026-02-23', '23 Feb'],
  ['2026-03-08', '8 Mar'],
  ['2026-03-20', 'Equinox'],
  ['2026-05-01', 'Spring days'],
  ['2026-05-09', '9 May'],
  ['2026-06-12', '12 Jun'],
  ['2026-06-21', 'Longest day'],
  ['2026-09-23', 'Autumn'],
  ['2026-10-30', 'Halloween'],
  ['2026-11-04', '4 Nov'],
]

const ruPlural = (n, one, few, many) => {
  const a = n % 10
  const b = n % 100
  if (a === 1 && b !== 11) return one
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few
  return many
}

function fmtDaylight(min) {
  const total = Math.round(min)
  return t('{0} h {1} min', Math.floor(total / 60), total % 60)
}

function fmtChange(sec) {
  const s = Math.abs(sec)
  if (s < 60) return t('{0} s', s)
  return t('{0} min {1} s', Math.floor(s / 60), s % 60)
}

function dayMonth(date) {
  return date.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })
}

/* ------------------------------------------------------- layer on top -- */

export function HolidayLayer() {
  const { theme, preview } = useHoliday()
  const switchRef = useRef(null)
  const barRef = useRef(null)
  const bar = { newyear: 'garland', may9: 'ribbon', jun12: 'tricolor' }[theme?.id] || null
  useEffect(() => {
    const root = document.documentElement
    if (theme) root.dataset.holiday = theme.id
    else delete root.dataset.holiday
    if (theme?.turn) root.dataset.holidayTurn = theme.turn
    else delete root.dataset.holidayTurn
    if (preview) root.dataset.holidayPreview = ''
    else delete root.dataset.holidayPreview
    if (bar) root.dataset.holidayBar = bar
    else delete root.dataset.holidayBar
    return () => {
      delete root.dataset.holiday
      delete root.dataset.holidayTurn
      delete root.dataset.holidayPreview
      delete root.dataset.holidayBar
    }
  }, [theme, preview, bar])
  useEffect(() => {
    const root = document.documentElement
    const watch = (el, name) => {
      if (!el) { root.style.removeProperty(name); return () => {} }
      const fit = () => root.style.setProperty(name, el.offsetHeight + 'px')
      fit()
      const ro = new ResizeObserver(fit)
      ro.observe(el)
      return () => { ro.disconnect(); root.style.removeProperty(name) }
    }
    const stopSwitch = watch(switchRef.current, '--holiday-switch')
    const stopBar = watch(barRef.current, '--holiday-bar')
    return () => { stopSwitch(); stopBar() }
  }, [theme, preview, bar])
  return (
    <>
      {preview && <div className="holiday-switch-wrap" ref={switchRef}><HolidaySwitch preview={preview} /></div>}
      {bar && (
        <div className="holiday-top" ref={barRef} aria-hidden="true">
          {bar === 'garland' && <Garland />}
          {bar === 'ribbon' && <div className="holiday-strip guard" />}
          {bar === 'tricolor' && <div className="holiday-strip russia" />}
        </div>
      )}
      {theme?.id === 'newyear' && <Fall kind="snow" density={1 / 45} max={120} />}
      {theme?.id === 'mar8' && <Fall kind="petal" density={1 / 110} max={40} colors={['#ff8fb3', '#ffc2d6', '#ff6f9f', '#ffe3ec']} />}
      {theme?.id === 'spring' && <Fall kind="petal" density={1 / 110} max={40} colors={['#ffffff', '#ffd6e5', '#fff0f5', '#ffe9a8']} />}
      {theme?.id === 'jun12' && <Fall kind="confetti" density={1 / 90} max={46} colors={['#ffffff', '#2a66e0', '#e0322b']} />}
      {theme?.id === 'equinox' && theme.turn === 'autumn' && <Fall kind="leaf" density={1 / 160} max={24} colors={['#e8622a', '#f2a33a', '#c9412a', '#e0b23a']} />}
      {theme?.id === 'halloween' && <><Bats /><Spider /></>}
    </>
  )
}

function HolidaySwitch({ preview }) {
  const current = isoOfDate(preview)
  return (
    <div className="holiday-switch" role="tablist" aria-label={t('Decorations')}>
      {PREVIEW_STOPS.map(([iso, label]) => (
        <button key={iso} type="button" role="tab" aria-selected={iso === current}
          className={iso === current ? 'on' : ''} onClick={() => setPreviewDay(iso)}>
          {t(label)}
        </button>
      ))}
    </div>
  )
}

function Garland() {
  const n = 14
  let d = ''
  for (let i = 0; i < n; i++) {
    const x0 = (i * 100) / n
    const x1 = ((i + 1) * 100) / n
    d += `${i ? '' : 'M0 2'}Q${(x0 + x1) / 2} 26 ${x1} 2`
  }
  return (
    <div className="garland">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d={d} fill="none" stroke="#2c3a2c" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ left: ((i + 0.5) * 100) / n + '%', animationDelay: -((i * 0.53) % 2.4) + 's' }} />
      ))}
    </div>
  )
}

// Deterministic scatter, so the layer does not reshuffle on every render.
const rnd = (i, k) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return x - Math.floor(x)
}

function usePageHeight(ref) {
  const [h, setH] = useState(0)
  useEffect(() => {
    const fit = () => {
      const next = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight)
      if (ref.current) ref.current.style.height = next + 'px'
      setH(prev => (Math.abs(prev - next) > 120 ? next : prev))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(document.body)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [ref])
  return h
}

// Falling things over the page. The layer is as tall as the document and scrolls with
// it; each piece falls most of a screen from its own spot and fades at both ends, so
// any part of the page has something drifting through it.
function Fall({ kind, density, max, colors = [] }) {
  const ref = useRef(null)
  const h = usePageHeight(ref)
  const n = Math.min(max, Math.max(16, Math.round((h || window.innerHeight) * density)))
  return (
    <div className={'hfall ' + kind} ref={ref} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        const size = kind === 'snow' ? 3 + rnd(i, 1) * 6 : kind === 'confetti' ? 6 + rnd(i, 1) * 4 : 9 + rnd(i, 1) * 7
        const flake = kind === 'snow' && i % 7 === 3
        return (
          <i key={i} style={{
            left: (rnd(i, 2) * 100).toFixed(2) + '%',
            top: (rnd(i, 3) * 100).toFixed(2) + '%',
            animationDuration: (9 + rnd(i, 4) * 9).toFixed(1) + 's',
            animationDelay: -(rnd(i, 5) * 18).toFixed(1) + 's',
            '--dx': ((rnd(i, 6) - 0.5) * 80).toFixed(0) + 'px',
            '--s': (flake ? 13 + rnd(i, 7) * 5 : size).toFixed(1) + 'px',
            '--c': colors[i % (colors.length || 1)],
            '--o': kind === 'snow' ? (0.45 + rnd(i, 8) * 0.5).toFixed(2) : 0.9,
          }}>
            {flake ? <Flake /> : <b style={{ animationDelay: -(rnd(i, 9) * 4).toFixed(1) + 's' }} />}
          </i>
        )
      })}
    </div>
  )
}

function Flake() {
  return (
    <svg viewBox="-10 -10 20 20" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none">
        {[0, 60, 120].map(a => <line key={a} x1="0" y1="-9" x2="0" y2="9" transform={`rotate(${a})`} />)}
        {[0, 60, 120, 180, 240, 300].map(a => <path key={a} d="M-3 -6L0 -3.5L3 -6" transform={`rotate(${a})`} />)}
      </g>
    </svg>
  )
}

function Bats() {
  return (
    <div className="hbats" aria-hidden="true">
      {[12, 30, 52, 70].map((top, i) => (
        <i key={i} style={{ top: top + '%', animationDelay: -(i * 5.5) + 's', animationDuration: 16 + i * 3 + 's' }}>
          <svg viewBox="-18 -9 36 16">
            <g className="hb-flap" style={{ animationDelay: -(i * 0.2) + 's' }}>
              <path fill="currentColor" d="M0 -2C-3 -7 -9 -8 -16 -6C-13 -4 -13 -1 -17 1C-11 0 -7 2 -5 5C-3 3 -1 3 0 5C1 3 3 3 5 5C7 2 11 0 17 1C13 -1 13 -4 16 -6C9 -8 3 -7 0 -2Z" />
            </g>
          </svg>
        </i>
      ))}
    </div>
  )
}

function Spider() {
  return (
    <div className="hspider" aria-hidden="true">
      <svg viewBox="-14 0 28 120">
        <line x1="0" y1="0" x2="0" y2="96" stroke="currentColor" strokeOpacity=".5" strokeWidth=".8" />
        <g transform="translate(0 102)" fill="#1a1022" stroke="#1a1022" strokeWidth="1.2" strokeLinecap="round">
          <ellipse rx="4.6" ry="5.4" />
          <circle cy="-6.4" r="3" />
          <path d="M-3 -2L-9 -6L-11 -1M-3 1L-10 1L-12 6M-3 3L-8 7L-9 11M3 -2L9 -6L11 -1M3 1L10 1L12 6M3 3L8 7L9 11" fill="none" />
          <circle cx="-1.2" cy="-6.8" r=".8" fill="#ff6a3d" stroke="none" />
          <circle cx="1.2" cy="-6.8" r=".8" fill="#ff6a3d" stroke="none" />
        </g>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------ banners -- */

function bannerCopy(theme, today) {
  switch (theme.id) {
    case 'newyear': return { kicker: t('Holidays until 10 January'), title: t('Happy New Year!'), line: t('Rest is part of the programme too.') }
    case 'feb23': return { kicker: t('23 February'), title: t('Happy Defender of the Fatherland Day!'), line: t('Celebrated since 1922. Strength, patience and a steady grip.') }
    case 'mar8': return { kicker: t('8 March'), title: t('Happy 8 March!'), line: t('Flowers, sunshine and a good mood. The barbell can wait a day.') }
    case 'spring': return { kicker: t('1–3 May'), title: t('Spring and Labour Day'), line: t('May holidays: sunshine, the dacha and the first barbecue of the year.') }
    case 'may9': return { kicker: t('9 May'), title: t('Happy Victory Day!'), line: t('1945 — {0}. We remember and we are proud.', today.getFullYear()) }
    case 'jun12': return { kicker: t('12 June'), title: t('Happy Russia Day!'), line: t('A big country: eleven time zones and one holiday.') }
    case 'solstice': return {
      kicker: t('Summer solstice'), title: t('The longest day'),
      line: t('Daylight in Moscow {0}. From tomorrow the day starts getting shorter.', fmtDaylight(dayLength(today))),
    }
    case 'equinox': {
      const change = fmtChange(dayLengthChange(today))
      return theme.turn === 'autumn'
        ? { kicker: t('Autumn equinox'), title: t('Day equals night'), line: t('Daylight {0}, and {1} less each day.', fmtDaylight(dayLength(today)), change) }
        : { kicker: t('Spring equinox'), title: t('Day equals night'), line: t('Daylight {0}, and {1} more each day.', fmtDaylight(dayLength(today)), change) }
    }
    case 'halloween': return { kicker: t('31 October'), title: t('Halloween'), line: t('Trick or treat? The treat comes after the last set.') }
    case 'unity': return { kicker: t('4 November'), title: t('Happy National Unity Day!'), line: t('In 1612 the militia of Minin and Pozharsky freed Moscow.') }
    default: return null
  }
}

function BannerArt({ theme }) {
  switch (theme.id) {
    case 'newyear': return <NewYearArt fireworks />
    case 'feb23': return <DefenderArt />
    case 'mar8': return <TulipArt />
    case 'spring': return <SpringArt />
    case 'may9': return <VictoryArt />
    case 'jun12': return <RussiaArt />
    case 'solstice': return <SolsticeArt />
    case 'equinox': return <EquinoxArt turn={theme.turn} />
    case 'halloween': return <HalloweenArt />
    case 'unity': return <UnityArt />
    default: return null
  }
}

/** The holiday card on Home: doors in December, a picture the rest of the time. */
export function HolidayBanner() {
  const { theme, preview } = useHoliday()
  if (!theme) return null
  const today = preview || new Date()
  if (theme.id === 'newyear' && today.getMonth() === 11) return <AdventCard today={today} preview={!!preview} />
  return <HolidayCard theme={theme} today={today} />
}

export function HolidayCard({ theme, today }) {
  const copy = bannerCopy(theme, today)
  if (!copy) return null
  return (
    <div className={'card hbanner hb-' + theme.id + (theme.turn ? ' hb-t-' + theme.turn : '')}>
      <BannerArt theme={theme} />
      <div className="hb-text">
        <div className="hb-kicker">{copy.kicker}</div>
        <div className="hb-title">{copy.title}</div>
        <div className="hb-line">{copy.line}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- advent -- */

// One door a day from 14 to 31 December. A joke, a fact or a small task —
// never advice about training. The solstice door is swapped for its own fact.
const ADVENT = [
  ['fact', 'In 1699 Peter I ordered the new year to start on 1 January, and gates to be decorated with spruce, pine and juniper.'],
  ['task', 'Peel a tangerine in one unbroken spiral. If it works, you are ready for the holidays.'],
  ['joke', 'Ded Moroz carries a heavy bag all night and never complains about his lower back. That is technique.'],
  ['fact', '"A little fir tree was born in the forest" was written by Raisa Kudasheva in 1903. Leonid Bekman set it to music for his little daughter.'],
  ['task', 'Send one warm message to someone you have not talked to in a while.'],
  ['joke', 'Olivier salad is made in sets: chop, rest, chop again. Rest between sets is two minutes and one tangerine.'],
  ['fact', 'Every snowflake has six arms because water freezes into a hexagonal lattice.'],
  ['task', 'Go outside for fifteen minutes while it is light. December has little daylight, catch it.'],
  ['joke', 'The most popular wish under the chimes among gym-goers: a free bench in January.'],
  ['task', 'Do 23 squats while the kettle boils. Not for progress, just for the holiday.'],
  ['fact', 'In Ostrovsky\'s 1873 play Snegurochka is the daughter of Frost and Spring. She became Ded Moroz\'s granddaughter later.'],
  ['joke', 'On 31 December even the laziest do cardio: one shop, another shop, "did we buy the peas?"'],
  ['task', 'Clear one shelf, or one folder on your phone. The new needs room.'],
  ['joke', 'The most honest coach in January is the scale. It can wait until the tenth.'],
  ['fact', '"The Irony of Fate" was first shown on television on 1 January 1976.'],
  ['task', 'Put on your favourite New Year song and listen to the end without skipping.'],
  ['joke', 'Rule of the holiday table: as many salads as sets in your longest routine.'],
  ['greet', 'Last door. Happy New Year! Rest is part of the programme too.'],
]

const KIND = { fact: 'Fact', joke: 'Joke', task: 'Task', greet: 'Greeting' }

function doorContent(iso) {
  const year = Number(iso.slice(0, 4))
  if (iso === winterSolsticeIso(year)) {
    const [y, m, d] = iso.split('-').map(Number)
    const minutes = dayLength(new Date(y, m - 1, d, 12))
    return ['fact', t('Today is the longest night of the year: in Moscow there is only {0} of daylight. From tomorrow the day starts getting longer.', fmtDaylight(minutes))]
  }
  const [kind, text] = ADVENT[Number(iso.slice(8)) - 14] || ADVENT[0]
  return [kind, t(text)]
}

function KindIcon({ kind }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true', className: 'door-ic' }
  if (kind === 'fact') return <svg {...common}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" /></svg>
  if (kind === 'joke') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 14c1 1.6 2.4 2.4 4 2.4s3-.8 4-2.4M9 9.5h.01M15 9.5h.01" /></svg>
  if (kind === 'task') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.6 2.6L16 9.6" /></svg>
  return <svg {...common}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></svg>
}

function DoorNote({ iso, close }) {
  const [kind, text] = doorContent(iso)
  const [y, m, d] = iso.split('-').map(Number)
  return (
    <div className={'door-note k-' + kind}>
      <div className="dn-head">
        <span className="dn-badge"><KindIcon kind={kind} /></span>
        <div>
          <div className="dn-kind">{t(KIND[kind])}</div>
          <div className="dn-date">{dayMonth(new Date(y, m - 1, d, 12))}</div>
        </div>
      </div>
      <div className="dn-text">{text}</div>
      <button type="button" className="btn primary" onClick={close}>{t('Nice')}</button>
    </div>
  )
}

export function AdventCard({ today, preview }) {
  const saved = useStore(s => s.S.adventOpen) || []
  const update = useStore(s => s.update)
  const [tried, setTried] = useState([])
  const opened = preview ? tried : saved
  const year = today.getFullYear()
  const todayIso = isoOfDate(today)
  const left = daysToNewYear(today)
  const solstice = todayIso === winterSolsticeIso(year)
  const open = iso => {
    if (iso > todayIso) return
    if (preview) setTried(list => (list.includes(iso) ? list : [...list, iso]))
    else if (!opened.includes(iso)) update(s => { s.adventOpen = [...(s.adventOpen || []), iso] })
    useUI.getState().openSheet(close => <DoorNote iso={iso} close={close} />, { kind: 'center' })
  }
  const title = left <= 1
    ? t('New Year is tonight!')
    : getLang() === 'ru'
      ? 'До Нового года ' + left + ' ' + ruPlural(left, 'день', 'дня', 'дней')
      : t('{0} days to New Year', left)
  const line = solstice
    ? t('The longest night. Tomorrow the day starts getting longer.')
    : t('One door a day. A missed one waits for you.')
  return (
    <div className="card hbanner hb-newyear advent-card">
      <div className="advent-head">
        <NewYearArt />
        <div className="hb-text">
          <div className="hb-kicker">{t('Advent calendar')}</div>
          <div className="hb-title">{title}</div>
          <div className="hb-line">{line}</div>
        </div>
      </div>
      <div className="advent">
        {adventDays(year).map((iso, i) => {
          const state = doorState(iso, todayIso, opened)
          const day = Number(iso.slice(8))
          const [kind] = state === 'open' ? doorContent(iso) : []
          return (
            <button key={iso} type="button" className={'door ' + state + ' c' + (i % 4)}
              disabled={state === 'future'} aria-label={t('Door {0}', day)} onClick={() => open(iso)}>
              {state === 'open' ? <KindIcon kind={kind} /> : <span className="door-n">{day}</span>}
              {state === 'today' && <span className="door-spark" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------- small pieces elsewhere -- */

/** A hat on the streak flame, for the holidays that have one. */
export function FlameHat({ theme: forced }) {
  const { theme: current } = useHoliday()
  const theme = forced || current
  const box = { x: 0, y: 0, width: '100%', height: '100%' }
  const hat = {
    newyear: <SantaHat {...box} />,
    feb23: <Ushanka {...box} />,
    mar8: <Wreath {...box} palette="mar8" />,
    spring: <StrawHat {...box} />,
    may9: <Pilotka {...box} />,
    halloween: <WitchHat {...box} />,
  }[theme?.id]
  if (!hat) return null
  return <span className={'flame-hat fh-' + theme.id} aria-hidden="true">{hat}</span>
}

/** Class and badge for the Start button. A running workout keeps its usual orange. */
export function startDecor(theme) {
  if (!theme) return { cls: '', badge: null }
  return {
    cls: ' hol-' + theme.id + (theme.turn ? ' hol-t-' + theme.turn : ''),
    badge: <StartBadge id={theme.id} turn={theme.turn} />,
  }
}
