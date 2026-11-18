// Moving a workout that is already in history to another date or start time, and correcting
// how long it ran. The sets stay as logged. The order of history and the record badges are
// what a new date can change.
import { insertChronological, backfillStart } from './backfill.js'
import { bestWeightForEntry } from './history.js'
import { beatsWeight } from './exercises.js'
import { stampWorkout } from './sync-merge.js'

// Before ids existed a workout was keyed for sync by its day and start time. Moving such a
// record would give it a new key, and the other device's untouched copy would come back as a
// second workout. Freezing the old key as the id keeps both sides on the same record.
export const legacySyncKey = w => `${w?.d}|${w?.start}`

export const startTimeOf = w => {
  const d = new Date(w?.start || 0)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const syncKeyOf = w => (w?.id != null ? w.id : legacySyncKey(w))
export const sameWorkout = (a, b) => syncKeyOf(a) === syncKeyOf(b)

export function retimeWorkout(w, iso, time) {
  const duration = Math.max(0, (w.end ?? w.start) - w.start)
  const start = backfillStart(iso, time)
  const moved = { ...w, d: iso, start, end: start + duration }
  if (w.id == null) moved.id = legacySyncKey(w)
  return moved
}

// A move can take a badge away from any session whose claim the new order breaks, but only
// the session that moved can gain one. Imported history is filed without badges on purpose.
export function rebuildPrHistory(workouts, exerciseIds, moved = null) {
  const ids = new Set(exerciseIds || [])
  if (!ids.size) return workouts
  const best = new Map()
  return workouts.map(w => {
    const had = w.prs || []
    const kept = []
    let trains = false
    for (const e of w.entries || []) {
      if (!ids.has(e.id)) continue
      trains = true
      const top = bestWeightForEntry(e)
      const leads = beatsWeight(e.id, top, best.get(e.id) || 0)
      if (leads) best.set(e.id, top)
      if (leads && (w === moved || had.includes(e.id))) kept.push(e.id)
    }
    if (!trains) return w
    const prs = [...new Set([...had.filter(id => !ids.has(id)), ...kept])]
    if (prs.length === had.length && prs.every((id, i) => id === had[i])) return w
    return { ...w, prs }
  })
}

export function moveWorkout(workouts, ref, iso, time, now = Date.now()) {
  const list = Array.isArray(workouts) ? workouts : []
  const current = list.find(w => sameWorkout(w, ref))
  if (!current) return null
  const moved = stampWorkout(retimeWorkout(current, iso, time), now)
  const filed = insertChronological(list.filter(w => w !== current), moved)
  return rebuildPrHistory(filed, (current.entries || []).map(e => e.id), moved)
}

export const MAX_DURATION_MIN = 24 * 60

export const endsInFuture = (iso, time, minutes, now = Date.now()) =>
  backfillStart(iso, time) + Math.max(0, Number(minutes) || 0) * 60000 > now

export const durationMinOf = w => Math.max(1, Math.round(Math.max(0, (w?.end ?? w?.start ?? 0) - (w?.start ?? 0)) / 60000))

export function setWorkoutDuration(workouts, ref, minutes, now = Date.now()) {
  const list = Array.isArray(workouts) ? workouts : []
  const current = list.find(w => sameWorkout(w, ref))
  const min = Math.min(MAX_DURATION_MIN, Math.max(1, Math.round(Number(minutes) || 0)))
  if (!current || !Number.isFinite(current.start) || (current.end != null && min === durationMinOf(current))) return null
  const edited = stampWorkout({ ...current, end: current.start + min * 60000 }, now)
  return list.map(w => (w === current ? edited : w))
}
