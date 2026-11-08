// One calendar year from the log: how many workouts, how long they lasted, how much
// was lifted, the longest run of weeks, and the exercise that showed up most.
// The date on the workout (`d`) decides the year, not UTC. Nothing here is stored
// or sent. Home shows the card from 1 December through 31 January; Stats can open
// any year that has a workout, including on the website.
import { weekKey, weekStartOf, isoOf } from './format.js'
import { workoutVolume } from './history.js'
import { completedVolumeOf, isWarmupRow } from './workout-model.js'

const HOUR = 3600000
const MAX_SESSION = 5 * HOUR
const LB_TO_KG = 0.45359237

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
 * The year the Home card is about, or null outside 1 December – 31 January.
 * December shows the year that is ending. January keeps the year that just ended.
 */
export function homeReviewYear(now = new Date()) {
  const month = now.getMonth() + 1
  if (month === 12) return now.getFullYear()
  if (month === 1) return now.getFullYear() - 1
  return null
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

function workRows(entry) {
  return (entry?.sets || []).filter(s => s?.done && !isWarmupRow(s))
}

/**
 * The year's numbers, or null when that year has no workout.
 * `hours` is null when no session recorded a real duration. `tonnes` is the
 * working volume in metric tonnes (a pound log is converted). Warm-ups are out.
 */
export function yearReview(S, year) {
  const workouts = workoutsOfYear(S, year)
  if (!workouts.length) return null
  const unit = S?.unit === 'lb' ? 'lb' : 'kg'
  let ms = 0
  let volume = 0
  const perEx = new Map()
  for (const w of workouts) {
    ms += sessionMs(w)
    volume += workoutVolume(w)
    for (const entry of w.entries || []) {
      const rows = workRows(entry)
      if (!rows.length || typeof entry?.id !== 'string') continue
      const cur = perEx.get(entry.id) || { sets: 0, vol: 0, name: null }
      cur.sets += rows.length
      cur.vol += rows.reduce((n, s) => n + completedVolumeOf(s), 0)
      cur.name = cur.name || entry.n || entry.muscleSnapshot?.n || null
      perEx.set(entry.id, cur)
    }
  }
  let favorite = null
  for (const [id, v] of perEx) {
    const better = !favorite
      || v.sets > favorite.sets
      || (v.sets === favorite.sets && (v.vol > favorite.vol || (v.vol === favorite.vol && id < favorite.id)))
    if (better) favorite = { id, ...v }
  }
  const kg = unit === 'lb' ? volume * LB_TO_KG : volume
  return {
    year: Number(year),
    unit,
    workouts: workouts.length,
    ms,
    hours: ms > 0 ? Math.round(ms / HOUR * 10) / 10 : null,
    volume,
    tonnes: Math.round(kg / 1000 * 100) / 100,
    streak: longestWeekRun(workouts, weekStartOf(S)),
    favorite,
  }
}
