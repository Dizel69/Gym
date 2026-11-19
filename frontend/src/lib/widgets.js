// What the Android home-screen widgets draw. The widget process cannot see the app's state,
// so the app hands it this snapshot whenever the log changes (WidgetBridgePlugin). Words are
// already in the app's language. The widget itself only re-reads the date, so "today" and the
// streak stay right after midnight without the app being open.
import { MOBILE, isAndroid } from './mobile.js'
import { effectiveRoutines } from './history.js'
import { deriveSessionName } from './session-merge.js'
import { todayISO, isoOf, fmtNum, weekKey, weekStartOf, ACCENTS } from './format.js'
import { getLang, t } from './i18n.js'

export const WIDGET_DAYS = 14
const WRITE_DEBOUNCE_MS = 800

const shift = (iso, days) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return isoOf(d)
}

const weekdayOf = iso => {
  try { return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' }) }
  catch { return '' }
}

function weeksWord(n) {
  const x = Math.abs(Number(n) || 0) % 100
  const d = x % 10
  if (getLang() === 'ru') {
    if (x > 10 && x < 20) return 'недель'
    if (d === 1) return 'неделя'
    if (d >= 2 && d <= 4) return 'недели'
    return 'недель'
  }
  return n === 1 ? 'week' : 'weeks'
}

function weighIns(S) {
  return (Array.isArray(S?.bodyweight) ? S.bodyweight : [])
    .filter(b => b && Number.isFinite(Number(b.w)))
    .sort((a, b) => String(a.d || '').localeCompare(String(b.d || '')) || (Number(a.t) || 0) - (Number(b.t) || 0))
}

function weightOf(S) {
  const unit = S?.unit === 'lb' ? 'lb' : 'kg'
  const rows = weighIns(S)
  const last = rows[rows.length - 1]
  const trend = rows.slice(-7).map(b => Number(b.w))
  if (!last) {
    return { dir: 'empty', unit, trend: [], value: '—', caption: t('No weigh-ins yet'), now: '' }
  }
  const current = Number(last.w)
  const now = `${fmtNum(current)} ${unit}`
  const goal = Number(S?.targetW)
  if (!(goal > 0)) {
    return { dir: 'none', unit, current, trend, value: fmtNum(current), caption: t('No goal yet'), now }
  }
  const toGo = Math.round(Math.abs(goal - current) * 10) / 10
  if (toGo < 0.05) {
    return { dir: 'there', unit, current, goal, toGo: 0, trend, value: fmtNum(current), caption: t('reached!'), now }
  }
  const dir = goal > current ? 'gain' : 'lose'
  return {
    dir, unit, current, goal, toGo, trend,
    value: fmtNum(toGo),
    caption: dir === 'gain' ? t('to gain') : t('to lose'),
    now,
  }
}

function dayOf(S, iso, today) {
  let routines = []
  try { routines = effectiveRoutines(S, iso).filter(r => (r.ex || []).length) } catch { routines = [] }
  const name = routines.length ? (deriveSessionName(routines.map(r => r.name || '').filter(Boolean)) || '') : ''
  let done = false
  if (iso === today && routines.length) {
    const logged = (S.workouts || []).filter(w => w && w.d === today)
    done = routines.every(r => logged.some(w => [].concat(w.routineIds || (w.routineId ? [w.routineId] : [])).includes(r.id)))
  }
  return { iso, name: name || '', weekday: weekdayOf(iso), done }
}

/** Plain JSON the home-screen widgets draw. `today` pins the clock for tests. */
export function buildWidgetSnapshot(S, { today = todayISO() } = {}) {
  const st = S || {}
  const ws = weekStartOf(st)
  const weeks = []
  const seen = new Set()
  for (const w of st.workouts || []) {
    if (!w?.d) continue
    const key = weekKey(w.d, ws)
    if (!seen.has(key)) { seen.add(key); weeks.push(key) }
  }
  weeks.sort()
  const days = []
  for (let i = 0; i < WIDGET_DAYS; i++) days.push(dayOf(st, shift(today, i), today))
  const accent = ACCENTS[st.accent] || ACCENTS.lime
  return {
    v: 1,
    today,
    accent,
    theme: st.theme === 'light' || st.theme === 'system' ? st.theme : 'dark',
    weekStart: ws,
    weeks,
    days,
    weight: weightOf(st),
    words: {
      one: weeksWord(1),
      few: getLang() === 'ru' ? 'недели' : '',
      many: weeksWord(5),
      row: t('in a row'),
      today: t('Today'),
      nothing: t('Nothing planned'),
      open: t('Open openGym'),
    },
  }
}

let pluginP = null
const widgetPlugin = () => pluginP || (pluginP = (async () => {
  if (!MOBILE || !(await isAndroid())) return null
  const { registerPlugin } = await import('@capacitor/core')
  return registerPlugin('WidgetBridge')
})().catch(() => null))

/** Writes the snapshot when the log changes, and again when the app comes back to the front. */
export async function startWidgetSync({ useStore }) {
  const bridge = await widgetPlugin()
  if (!bridge) return () => {}
  let last = null
  let tm = null
  const write = async () => {
    tm = null
    try {
      const json = JSON.stringify(buildWidgetSnapshot(useStore.getState().S))
      if (json === last) return
      await bridge.write({ json })
      last = json
    } catch { /* the next change tries again */ }
  }
  const schedule = () => { clearTimeout(tm); tm = setTimeout(write, WRITE_DEBOUNCE_MS) }
  const off = useStore.subscribe((s, prev) => { if (s.S !== prev.S) schedule() })
  const onVisible = () => { if (document.visibilityState === 'visible') write() }
  document.addEventListener('visibilitychange', onVisible)
  write()
  return () => { off(); clearTimeout(tm); document.removeEventListener('visibilitychange', onVisible) }
}
