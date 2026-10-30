/* A day's watch summary, kept beside the workout log and never fed into it.
 *
 * The phone reads Health Connect (Samsung Health shares steps, sleep and active
 * calories into it) and writes one small row per local day. The website shows
 * those rows after the phone syncs. A missing field means "this read didn't
 * include it" — a later merge keeps the number already stored.
 *
 *   { d: 'YYYY-MM-DD', steps?: number, sleepMin?: number, activeKcal?: number }
 */

const DAY = /^\d{4}-\d{2}-\d{2}$/

/** Settings switch. An older profile with no key still imports. */
export const healthImportOn = S => S?.healthImport !== false

function numOrNull(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

/** One clean row, or null when the day or every number is unusable. */
export function healthDay(row) {
  if (!row || typeof row.d !== 'string' || !DAY.test(row.d)) return null
  const steps = numOrNull(row.steps)
  const sleepMin = numOrNull(row.sleepMin)
  const activeKcal = numOrNull(row.activeKcal)
  if (steps == null && sleepMin == null && activeKcal == null) return null
  const out = { d: row.d }
  if (steps != null) out.steps = steps
  if (sleepMin != null) out.sleepMin = sleepMin
  if (activeKcal != null) out.activeKcal = activeKcal
  return out
}

/**
 * Union by day. `incoming` wins a field it actually carries; a field it omits
 * stays from `existing`. Oldest days past `keep` are dropped.
 */
export function mergeHealthDays(existing, incoming, keep = 90) {
  const byDay = new Map()
  for (const row of Array.isArray(existing) ? existing : []) {
    const clean = healthDay(row)
    if (clean) byDay.set(clean.d, clean)
  }
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const clean = healthDay(row)
    if (!clean) continue
    const prev = byDay.get(clean.d)
    byDay.set(clean.d, prev ? { ...prev, ...clean } : clean)
  }
  return [...byDay.values()].sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-keep)
}

/** Hours and leftover minutes for a sleep duration, or null when there is none. */
export function sleepParts(min) {
  if (min == null || !Number.isFinite(Number(min)) || Number(min) < 0) return null
  const m = Math.round(Number(min))
  return { h: Math.floor(m / 60), m: m % 60 }
}
