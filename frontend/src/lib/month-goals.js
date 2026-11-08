// Three goals for the calendar month, read from the log. Nothing is stored:
// the month ends, the old bars go with it, and the next month is a new game.
// Targets are the rounded average of up to three earlier months that actually
// had a workout. An empty month is skipped, so a quiet month does not wipe
// the game. The month on screen never sets its own target.
import { monthKey, shiftMonth } from './year-review.js'
import { workoutVolume } from './history.js'

const LOOKBACK = 3

function inMonth(w, ym) {
  return typeof w?.d === 'string' && w.d.startsWith(ym + '-')
}

function volumeOf(w) {
  if (w?.entries) return workoutVolume(w)
  const saved = Number(w?.vol)
  return saved > 0 ? saved : 0
}

function tally(rows) {
  let volume = 0
  let records = 0
  for (const w of rows) {
    volume += volumeOf(w)
    if (Array.isArray(w.prs)) records += w.prs.length
  }
  return { workouts: rows.length, volume, records }
}

export function monthTotals(workouts, ym) {
  const rows = (workouts || []).filter(w => inMonth(w, ym))
  if (!rows.length) return null
  return tally(rows)
}

function pastMonths(workouts, ym) {
  const found = []
  let cursor = shiftMonth(ym, -1)
  for (let i = 0; i < 36 && found.length < LOOKBACK; i++) {
    const rows = workouts.filter(w => inMonth(w, cursor))
    if (rows.length) found.push(tally(rows))
    cursor = shiftMonth(cursor, -1)
  }
  return found
}

/**
 * Goals for one calendar month, or null when no earlier month has a workout.
 * `goals` keeps workouts, then volume, then records. A volume or record
 * target that rounds to nothing is left off: a bar at zero is not a game.
 */
export function goalsForMonth(S, ym) {
  const workouts = S?.workouts || []
  const past = pastMonths(workouts, ym)
  if (!past.length) return null
  const avg = key => past.reduce((sum, month) => sum + month[key], 0) / past.length
  const current = tally(workouts.filter(w => inMonth(w, ym)))
  const goals = [{ id: 'workouts', target: Math.max(1, Math.round(avg('workouts'))), value: current.workouts }]
  const volume = Math.round(avg('volume'))
  if (volume >= 1) goals.push({ id: 'volume', target: volume, value: current.volume })
  const records = Math.round(avg('records'))
  if (records >= 1) goals.push({ id: 'records', target: records, value: current.records })
  return { ym, months: past.length, goals }
}

export function monthGoals(S, now = new Date()) {
  return goalsForMonth(S, monthKey(now))
}
