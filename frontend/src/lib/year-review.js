// Year-in-review and one calendar month, both from the log on this device.
// The date on the workout (`d`) decides the year and the month, not UTC.
// Nothing here is stored or sent. Home shows the year stories only from
// 14 December through 31 December. Stats shows one month at a time.
import { isoOf, weekKey, weekStartOf } from './format.js'
import { lastBW, workoutVolume } from './history.js'
import { completedVolumeOf, isWarmupRow } from './workout-model.js'
import { estimate1RM } from './onerm.js'

const HOUR = 3600000
const DAY = 86400000
const MAX_SESSION = 5 * HOUR
const LB_TO_KG = 0.45359237

// Strength Level’s published community-average 1RM, whole community, not scaled
// to body weight. Men: bench 212 lb, squat 289 lb, deadlift 340 lb.
// Women: bench 112 lb, squat 167 lb, deadlift 200 lb.
// https://strengthlevel.com/strength-standards/bench-press (checked 8 Nov 2026)
const COMMUNITY_KG = {
  male: { '0025': 96, '0043': 131, '3593': 131, '0032': 154, '0117': 154 },
  female: { '0025': 51, '0043': 76, '3593': 76, '0032': 91, '0117': 91 },
}

// Picture weights, not lift standards. A Labrador is about 30 kg, a cement bag
// is 50 kg, a household wardrobe is taken as 70 kg, a small car as 1.4 t.
const THINGS = [
  { key: 'dog', kg: 30 },
  { key: 'cement', kg: 50 },
  { key: 'wardrobe', kg: 70 },
  { key: 'car', kg: 1400 },
]

export function workoutsOfYear(S, year) {
  const y = String(year)
  return (S?.workouts || []).filter(w => typeof w?.d === 'string' && w.d.startsWith(y + '-'))
}

/** Years that have at least one workout, newest first. */
export function reviewYears(S) {
  const years = new Set()
  for (const w of S?.workouts || []) {
    if (typeof w?.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.d)) years.add(Number(w.d.slice(0, 4)))
  }
  return [...years].sort((a, b) => b - a)
}

/**
 * The year the Home card is about, or null outside 14–31 December.
 * December shows the year that is ending. January stays quiet.
 */
export function homeReviewYear(now = new Date()) {
  const month = now.getMonth() + 1
  if (month === 12 && now.getDate() >= 14) return now.getFullYear()
  return null
}

export function monthKey(now = new Date()) {
  return isoOf(now).slice(0, 7)
}

export function shiftMonth(ym, by) {
  const [y, m] = String(ym).split('-').map(Number)
  return isoOf(new Date(y, m - 1 + by, 1)).slice(0, 7)
}

/** Months that have at least one workout, newest first. */
export function monthsWithWorkouts(S) {
  const months = new Set()
  for (const w of S?.workouts || []) {
    if (typeof w?.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.d)) months.add(w.d.slice(0, 7))
  }
  return [...months].sort((a, b) => b.localeCompare(a))
}

function nextWeek(iso) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + 7)
  return isoOf(d)
}

/** Longest run of weeks that each contain a workout. One week on its own is 1. */
export function longestWeekRun(workouts, weekStart) {
  const keys = [...new Set(workouts.map(w => weekKey(w.d, weekStart)))].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const key of keys) {
    run = prev && nextWeek(prev) === key ? run + 1 : 1
    if (run > best) best = run
    prev = key
  }
  return best
}

function sessionMs(w) {
  const start = Number(w?.start)
  const end = Number(w?.end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  const ms = end - start
  return ms <= MAX_SESSION ? ms : 0
}

function volumeOf(w) {
  if (!w?.entries) return 0
  return workoutVolume(w)
}

function workRows(entry) {
  return (entry?.sets || []).filter(s => s?.done && !isWarmupRow(s))
}

function topWorkSet(entry) {
  let best = null
  for (const s of workRows(entry)) {
    const w = Number(s.w)
    const r = Number(s.r)
    if (!(w > 0) || !(r > 0)) continue
    const est = estimate1RM(w, r) || w
    if (!best || est > best.est || (est === best.est && w > best.w)) best = { w, r: Math.round(r), est }
  }
  return best
}

function sessionSnapshot(w) {
  const byId = new Map()
  for (const entry of w?.entries || []) {
    if (typeof entry?.id !== 'string') continue
    const top = topWorkSet(entry)
    if (!top) continue
    const prev = byId.get(entry.id)
    if (!prev || top.est > prev.est) byId.set(entry.id, { ...top, name: entry.n || entry.muscleSnapshot?.n || null })
  }
  return { d: w?.d || null, volume: volumeOf(w), byId }
}

function whenOf(w) {
  const t = Number(w?.start)
  if (Number.isFinite(t)) return t
  const parsed = Date.parse((w?.d || '') + 'T12:00:00')
  return Number.isFinite(parsed) ? parsed : 0
}

function dayNum(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  if (!y || !m || !d) return null
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}

/** Turn a weight into a countable object. `pile` is for a whole year of volume. */
export function liken(kg, pile = false) {
  if (!(kg > 0)) return null
  let best = null
  for (const thing of THINGS) {
    if (!pile && thing.key === 'car') continue
    const exact = kg / thing.kg
    const count = Math.max(1, Math.round(exact))
    if (!pile && count > 12) continue
    if (pile && count < 2) continue
    if (pile && count > 5000) continue
    const error = Math.abs(exact - count) / Math.max(exact, 1)
    if (error > 0.2) continue
    const rank = { dog: 0, wardrobe: 1, car: 2, cement: 3 }[thing.key]
    const score = error + (pile ? count / 5000 : 0)
    if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) < 1e-9 && rank < best.rank)) {
      best = { key: thing.key, count, kg: thing.kg, error, rank, score }
    }
  }
  return best && { key: best.key, count: best.count, kg: best.kg }
}

function headlineLift(perEx) {
  let best = null
  for (const [id, v] of perEx) {
    if (!v.best) continue
    if (!best || v.best.est > best.est) best = { id, name: v.name, est: v.best.est, w: v.best.w, r: v.best.r }
  }
  return best
}

function communityOf(S, perEx) {
  const table = COMMUNITY_KG[S?.body === 'female' ? 'female' : 'male']
  let pick = null
  for (const [id, v] of perEx) {
    if (!table[id] || !v.best) continue
    if (!pick || v.sets > pick.sets || (v.sets === pick.sets && v.best.est > pick.est)) {
      pick = { id, name: v.name, est: v.best.est, average: table[id], sets: v.sets }
    }
  }
  if (!pick) return null
  return {
    ...pick,
    sex: S?.body === 'female' ? 'female' : 'male',
    delta: Math.round((pick.est - pick.average) * 10) / 10,
  }
}

function favoriteOf(perEx) {
  let favorite = null
  for (const [id, v] of perEx) {
    const better = !favorite
      || v.sets > favorite.sets
      || (v.sets === favorite.sets && (v.vol > favorite.vol || (v.vol === favorite.vol && id < favorite.id)))
    if (better) favorite = { id, ...v }
  }
  return favorite
}

function collect(workouts) {
  let ms = 0
  let longest = 0
  let volume = 0
  const perEx = new Map()
  let heaviest = null
  const byMonth = new Map()
  for (const w of workouts) {
    const dur = sessionMs(w)
    ms += dur
    if (dur > longest) longest = dur
    const vol = volumeOf(w)
    volume += vol
    if (!heaviest || vol > heaviest.volume) heaviest = { d: w.d, volume: vol }
    const ym = typeof w.d === 'string' ? w.d.slice(0, 7) : ''
    if (ym) byMonth.set(ym, (byMonth.get(ym) || 0) + vol)
    for (const entry of w.entries || []) {
      const rows = workRows(entry)
      if (!rows.length || typeof entry?.id !== 'string') continue
      const cur = perEx.get(entry.id) || { sets: 0, vol: 0, name: null, best: null }
      cur.sets += rows.length
      cur.vol += rows.reduce((n, s) => n + completedVolumeOf(s), 0)
      cur.name = cur.name || entry.n || entry.muscleSnapshot?.n || null
      for (const s of rows) {
        const w = Number(s.w)
        const r = Number(s.r)
        if (!(w > 0) || !(r > 0)) continue
        const est = estimate1RM(w, r)
        if (est && (!cur.best || est > cur.best.est)) cur.best = { w, r: Math.round(r), est }
      }
      perEx.set(entry.id, cur)
    }
  }
  let busiest = null
  for (const [ym, vol] of byMonth) {
    if (!busiest || vol > busiest.volume || (vol === busiest.volume && ym < busiest.ym)) busiest = { ym, volume: vol }
  }
  return { ms, longest, volume, perEx, heaviest, busiest }
}

function progressOf(sorted) {
  if (sorted.length < 2) return null
  const first = sessionSnapshot(sorted[0])
  const last = sessionSnapshot(sorted[sorted.length - 1])
  let pick = null
  for (const [id, a] of first.byId) {
    const b = last.byId.get(id)
    if (!b) continue
    const delta = Math.round((b.w - a.w) * 10) / 10
    const row = { id, name: b.name || a.name, first: { w: a.w, r: a.r, d: first.d }, last: { w: b.w, r: b.r, d: last.d }, delta }
    if (!pick || Math.abs(delta) > Math.abs(pick.delta) || (Math.abs(delta) === Math.abs(pick.delta) && delta > pick.delta)) pick = row
  }
  if (pick) return pick
  if (first.volume === 0 && last.volume === 0) return null
  return { id: null, name: null, first: { d: first.d, volume: first.volume }, last: { d: last.d, volume: last.volume }, delta: null }
}

function pack(S, workouts) {
  const unit = S?.unit === 'lb' ? 'lb' : 'kg'
  const totals = collect(workouts)
  const kg = unit === 'lb' ? totals.volume * LB_TO_KG : totals.volume
  const bw = Number(lastBW({ bodyweight: S?.bodyweight || [] })?.w)
  const copies = bw > 0 && kg > 0 ? Math.round(kg / bw) : null
  const lift = headlineLift(totals.perEx)
  return {
    unit,
    workouts: workouts.length,
    ms: totals.ms,
    hours: totals.ms > 0 ? Math.round(totals.ms / HOUR * 10) / 10 : null,
    longestMin: totals.longest > 0 ? Math.round(totals.longest / 60000) : null,
    avgMin: totals.ms > 0 && workouts.length ? Math.round(totals.ms / workouts.length / 60000) : null,
    volume: totals.volume,
    avgVolume: workouts.length ? totals.volume / workouts.length : 0,
    tonnes: Math.round(kg / 1000 * 100) / 100,
    bodyCopies: copies >= 1 ? copies : null,
    favorite: favoriteOf(totals.perEx),
    heaviest: totals.heaviest,
    busiest: totals.busiest,
    lift,
    joke: lift ? liken(lift.est) : null,
    pile: liken(kg, true),
    community: communityOf(S, totals.perEx),
  }
}

/**
 * The year's numbers, or null when that year has no workout.
 * Comparisons are inside the user's own log: their average, their first
 * session against their last, and how many times they lifted their own
 * body weight. Warm-ups are out of the volume.
 */
export function yearReview(S, year) {
  const workouts = workoutsOfYear(S, year)
  if (!workouts.length) return null
  const sorted = [...workouts].sort((a, b) => String(a.d).localeCompare(String(b.d)) || whenOf(a) - whenOf(b))
  const firstDay = dayNum(sorted[0].d)
  const lastDay = dayNum(sorted[sorted.length - 1].d)
  const spanDays = firstDay != null && lastDay != null ? lastDay - firstDay : 0
  return {
    year: Number(year),
    ...pack(S, workouts),
    streak: longestWeekRun(workouts, weekStartOf(S)),
    spanDays,
    everyDays: workouts.length > 1 && spanDays > 0 ? Math.max(1, Math.round(spanDays / (workouts.length - 1))) : null,
    progress: progressOf(sorted),
  }
}

/** One calendar month. An empty month is zeros, so the pager can land on it. */
export function monthStats(S, ym) {
  const key = String(ym)
  const workouts = (S?.workouts || []).filter(w => typeof w?.d === 'string' && w.d.startsWith(key + '-'))
  return { ym: key, ...pack(S, workouts) }
}
