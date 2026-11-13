// Weekly working sets against a range you set: "Chest 14 / 10–20" on Stats, and one
// optional Home line for the muscle furthest outside its range.
//
// What counts is this calendar week (the profile's week start), ticked sets only.
// Warm-ups are left out by loadOfWorkouts. A set credits each primary muscle with 1
// and each supporting muscle with 0.4, the same weights the muscle map uses.
// A per-side set is one set. Cardio with no main muscle adds nothing.
//
// The starting ranges follow the hypertrophy landmarks the upstream card uses
// (about 10–20 working sets a week for a big muscle). Shoulders are three muscles
// here, so each head has its own starting range instead of one shared "deltoids"
// number. A range you change is stored on S.muscleTargets; the suggested one is
// not stored. Below the low end is room, not a failing grade. Past the high end
// is more than the range.
import { loadOfWorkouts, MUSCLE_NAME } from './muscles.js'
import { weekKey, weekStartOf, todayISO } from './format.js'

export const DEFAULT_TARGETS = {
  'front-deltoid': [6, 12],
  'side-deltoid': [8, 16],
  'rear-deltoid': [6, 12],
  chest: [10, 20],
  'upper-back': [10, 20],
  biceps: [8, 18],
  triceps: [6, 16],
  abs: [6, 16],
  gluteal: [4, 16],
  quadriceps: [8, 18],
  hamstring: [6, 16],
  calves: [8, 16],
}
export const TARGET_MUSCLES = Object.keys(DEFAULT_TARGETS)
export const TARGET_MAX = 40

/** The `[low, high]` range of a muscle: yours when you set one, else the suggestion. */
export function targetOf(S, slug) {
  const own = S?.muscleTargets?.[slug]
  if (Array.isArray(own) && own.length === 2) {
    const lo = Math.round(Number(own[0])), hi = Math.round(Number(own[1]))
    if (Number.isFinite(lo) && Number.isFinite(hi) && lo >= 0 && hi >= lo && hi <= TARGET_MAX) return [lo, hi]
  }
  return DEFAULT_TARGETS[slug] ? [...DEFAULT_TARGETS[slug]] : null
}

/** 'below', 'in' or 'above' the range. */
export const statusOf = (sets, [lo, hi]) => (sets < lo - 1e-9 ? 'below' : sets > hi + 1e-9 ? 'above' : 'in')

/** Sets rounded for the screen: whole, or one decimal when a supporting share leaves one. */
export const roundSets = n => Math.round((Number(n) || 0) * 10) / 10

/**
 * Every ranged muscle's working sets this week:
 * [{ slug, name, sets, lo, hi, status }], in body order. `today` pins the week for tests.
 */
export function weeklyMuscleSets(S, today = todayISO()) {
  const ws = weekStartOf(S)
  const wk = weekKey(today, ws)
  const workouts = (S?.workouts || []).filter(w => w && weekKey(w.d, ws) === wk)
  const load = loadOfWorkouts(workouts)
  return TARGET_MUSCLES.map(slug => {
    const [lo, hi] = targetOf(S, slug)
    const sets = roundSets(load[slug] || 0)
    return { slug, name: MUSCLE_NAME[slug], sets, lo, hi, status: statusOf(sets, [lo, hi]) }
  })
}

/**
 * The muscle furthest outside its range this week, by the share it is short or over.
 * Inside the range is not a candidate. A tie keeps the earlier muscle.
 */
export function furthestOff(rows) {
  let best = null
  let bestGap = 0
  for (const row of rows || []) {
    let gap = 0
    if (row.status === 'below' && row.lo > 0) gap = (row.lo - row.sets) / row.lo
    else if (row.status === 'above' && row.hi > 0) gap = (row.sets - row.hi) / row.hi
    else if (row.status === 'above' && row.hi === 0 && row.sets > 0) gap = 1
    if (gap > bestGap + 1e-9) { best = row; bestGap = gap }
  }
  return best
}

/** S.muscleTargets with `slug` set to [lo, hi], or back on the suggestion when that is what you picked. */
export function withTarget(targets, slug, range) {
  const out = { ...(targets && typeof targets === 'object' ? targets : {}) }
  if (!range) { delete out[slug]; return out }
  let [lo, hi] = range.map(n => Math.max(0, Math.min(TARGET_MAX, Math.round(Number(n) || 0))))
  if (hi < lo) [lo, hi] = [hi, lo]
  const suggested = DEFAULT_TARGETS[slug]
  if (suggested && suggested[0] === lo && suggested[1] === hi) delete out[slug]
  else out[slug] = [lo, hi]
  return out
}
