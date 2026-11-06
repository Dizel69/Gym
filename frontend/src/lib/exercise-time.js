// How long each exercise of a workout took, from the times its sets were ticked (`at`).
// The time up to each tick goes to that set's exercise: from the workout's start to the first
// tick, then from tick to tick. Rest and setup count. A pause longer than twenty minutes is a
// break, not the next exercise's. A workout with no tick times (imported, or logged before
// they were kept) has none.
import { hasCompletedWork, isSideSet } from './workout-model.js'

export const EXERCISE_GAP_MS = 20 * 60 * 1000

function rowLengthMs(set) {
  const n = v => (Number(v) > 0 ? Number(v) : 0)
  if (isSideSet(set)) return (n(set.sides.L?.sec) + n(set.sides.R?.sec)) * 1000
  return n(set.min) * 60000 + n(set.sec) * 1000
}

/** Stamp or clear the tick time when a set gains or loses completed work. */
export function stampTick(set, now = Date.now()) {
  if (!set) return set
  if (hasCompletedWork(set)) {
    if (!Number.isFinite(set.at)) set.at = now
  } else delete set.at
  return set
}

/** Each entry's time in ms, by its index (`undefined` for an entry with none); [] when none has. */
export function entryTimes(w, gap = EXERCISE_GAP_MS) {
  const start = Number(w?.start)
  if (!Number.isFinite(start) || !Array.isArray(w?.entries)) return []
  const end = Number(w.end)
  const last = Number.isFinite(end) ? end + gap : Infinity
  const ticks = []
  w.entries.forEach((e, idx) => (e?.sets || []).forEach(s => {
    if (hasCompletedWork(s) && Number.isFinite(s.at) && s.at >= start && s.at <= last) ticks.push({ idx, at: s.at, len: rowLengthMs(s) })
  }))
  ticks.sort((a, b) => a.at - b.at)
  const out = []
  let prev = start
  for (const { idx, at, len } of ticks) {
    let step
    if (at - len - prev > gap) { step = len; prev = Math.max(at, prev + len) } else {
      const reach = Math.max(at, prev + len)
      step = reach - prev
      prev = reach
    }
    out[idx] = (out[idx] || 0) + step
  }
  return out
}

/**
 * Each exercise's time over the workouts started at or after `since` (ms, 0 for all):
 * `[{ id, sessions, total, avg }]`, the longest average first.
 */
export function exerciseTimeRows(workouts, since = 0) {
  const by = new Map()
  for (const w of workouts || []) {
    if (since && !(Number(w?.start) >= since)) continue
    const times = entryTimes(w)
    const seen = new Set()
    times.forEach((ms, i) => {
      if (!(ms > 0)) return
      const id = w.entries[i].id
      const row = by.get(id) || by.set(id, { id, sessions: 0, total: 0 }).get(id)
      if (!seen.has(id)) { seen.add(id); row.sessions++ }
      row.total += ms
    })
  }
  return [...by.values()].map(r => ({ ...r, avg: r.total / r.sessions }))
    .sort((a, b) => b.avg - a.avg || String(a.id).localeCompare(String(b.id)))
}
