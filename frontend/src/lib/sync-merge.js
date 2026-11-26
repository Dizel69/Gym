/* Two copies of the account state, one merged copy.
 *
 * The server refuses a push over a document the device never saw (PUT /api/data with a stale
 * `baseRev` answers 409 and hands back the current document). Before revisions the newer `_ts`
 * simply replaced the other copy wholesale — which is exactly how a desktop tab that sat open
 * all day dropped the workout the phone logged in the meantime. The merge keeps both sides'
 * entries and lets the newer copy decide everything that has no natural union.
 *
 * Rules, by field:
 *   - scalars and settings, `week`, `dayPlan`, `wc`, `reminder`, …: from the copy with the newer `_ts`
 *   - workouts, customEx, equipProfiles, gymCards: union by id, the newer copy's version
 *     of an id that both have; workouts sorted by day and start like every other writer
 *   - routines: union by id, then field by field (`_f`, api/routine-sync.js). A weight saved on
 *     one device and a name saved on the other both stay. A copy with only `editedAt` still
 *     counts as one whole save at that time. A routine listed in `deleted` stays gone when
 *     that removal is at least as new as the copy.
 *   - bodyweight: union by day, the later-edited (`t`) entry of a day that both have
 *   - healthDays: union by day; the newer copy's numbers win, a field it omits stays
 *   - favEx: ordered set union, the newer copy first
 *   - exWeights: union by exercise, the better `w` for that exercise — larger for an ordinary
 *     lift, smaller on an assistance machine (a PR logged on the other device must not be
 *     forgotten, whichever way it runs); exNotes, barWeights: key union
 *   - `_ts`: the later of the two; `_rev` dropped (the server sets it); `active` left to the caller
 *
 * Known limit: workouts, weigh-ins and the other lists still have no record of a removal, so one
 * deleted inside the conflict window comes back from the other device. Routines do not: the
 * removal is `deleted.routines`.
 */
import { applyRoutineDeletions, mergeDeletedMap, mergeRoutineList, stampPlanChange } from '../../../api/routine-sync.js'
export { stampPlanChange }
import { beatsWeight } from './exercises.js'
import { applyExerciseMerges } from './exercise-merge.js'
import { mergeHealthDays } from './health.js'
import { mergeDay } from './weigh-ins.js'
import { normalizeMeasurementsState } from './measurements.js'

const clone = o => JSON.parse(JSON.stringify(o))
const list = v => (Array.isArray(v) ? v : [])

/** The copy with the later `_ts`; on a tie the first argument (callers pass local first). */
export const newerOf = (a, b) => ((b?._ts || 0) > (a?._ts || 0) ? b : a)

/**
 * Entries of `newer` in their order, then those of `older` whose key nothing in `newer` has.
 * Same key → `newer`'s entry. Duplicate keys within one list are dropped (first wins).
 */
export function unionById(newer = [], older = [], key = x => x?.id) {
  const seen = new Set()
  const out = []
  for (const x of [...list(newer), ...list(older)]) {
    const k = key(x)
    if (k == null) { out.push(x); continue }
    if (seen.has(k)) continue
    seen.add(k)
    out.push(x)
  }
  return out
}

const workoutKey = w => (w?.id != null ? w.id : `${w?.d}|${w?.start}`)

/** An edit of a saved workout records when it happened, so a newer copy of that one workout wins. */
export function stampWorkout(w, now = Date.now()) {
  if (w && typeof w === 'object') w._ts = now
  return w
}

const workoutStamp = w => {
  const n = Number(w?._ts)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Union by id, but a copy of the same workout that was edited later wins even when it sits in
// the older document. A phone that only logged a new session must not put back the 100 kg the
// other phone just corrected to 80. Workouts with no stamp keep the newer document's copy.
function mergeWorkouts(newer = [], older = []) {
  const olderByKey = new Map()
  for (const w of list(older)) {
    const k = workoutKey(w)
    if (k != null && !olderByKey.has(k)) olderByKey.set(k, w)
  }
  const seen = new Set()
  const out = []
  for (const w of list(newer)) {
    const k = workoutKey(w)
    if (k == null) { out.push(w); continue }
    if (seen.has(k)) continue
    seen.add(k)
    const prev = olderByKey.get(k)
    out.push(prev && workoutStamp(prev) > workoutStamp(w) ? prev : w)
  }
  for (const w of list(older)) {
    const k = workoutKey(w)
    if (k == null || seen.has(k)) continue
    seen.add(k)
    out.push(w)
  }
  return out
}

/** A plan edit records when it happened. Health and other writes do not. */
export function stampRoutine(routine, at = Date.now()) {
  if (routine && typeof routine === 'object') routine.editedAt = at
  return routine
}

/**
 * Union of two routine lists. A shared id keeps each field from the side that changed it last.
 * A routine saved before field stamps (`editedAt` only) still wins as a whole when that save is
 * the later one.
 */
export function mergeRoutines(newer = [], older = []) {
  return mergeRoutineList(newer, older)
}
const byDayStart = (a, b) => (a.d === b.d ? (a.start || 0) - (b.start || 0) : a.d < b.d ? -1 : 1)

/** One entry per day. Readings on either side are merged; a plain day still keeps the later edit. */
export function mergeBodyweight(a = [], b = []) {
  const byDay = new Map()
  for (const e of [...list(a), ...list(b)]) {
    if (!e || e.d == null) continue
    const cur = byDay.get(e.d)
    if (!cur) { byDay.set(e.d, e); continue }
    if (Array.isArray(cur.ins) || Array.isArray(e.ins)) {
      const merged = mergeDay(cur, e)
      if (merged) byDay.set(e.d, merged)
      else byDay.delete(e.d)
    } else if ((e.t || 0) > (cur.t || 0)) byDay.set(e.d, e)
  }
  return [...byDay.values()].sort((x, y) => (x.d < y.d ? -1 : 1))
}

// The kept load per exercise. "The larger one wins" held while the app only ever raised it —
// but an assistance machine progresses downwards, so there the smaller number is the newer,
// harder setting and taking the larger would hand back the help the other device just dropped
// (issue #232). `beatsWeight` knows which way round each exercise runs; the date breaks a tie
// on an exercise where both sides moved in the same direction.
function mergeExWeights(n = {}, o = {}) {
  const out = { ...(o || {}), ...(n || {}) }
  for (const k of Object.keys(o || {})) {
    if (!(n && n[k] && o[k])) continue
    if (beatsWeight(k, o[k].w || 0, n[k].w || 0)) out[k] = o[k]
  }
  return out
}

// One answer per day. A day written on both sides keeps the later stamp, and a day that
// only one side has is kept. The check-in is not a setting, so the newer document must
// not drop the other device's mornings.
function mergeDayForm(newer, older) {
  const map = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : null)
  const a = map(newer)
  const b = map(older)
  if (!a && !b) return null
  const out = { ...(b || {}) }
  for (const [k, v] of Object.entries(a || {})) {
    const prev = out[k]
    if (!prev || (Number(v?._ts) || 0) >= (Number(prev._ts) || 0)) out[k] = v
  }
  return out
}

// `prefer` names the side whose settings, plan and per-exercise config win regardless of `_ts`:
// on sign-in the server's profile is the truth and the device only contributes the entries it
// logged while signed out. Without it the newer copy decides, as for a conflict between devices.
export function mergeStates(a, b, { prefer } = {}) {
  if (!a) return b ? clone(b) : b
  if (!b) return clone(a)
  const n = prefer === 'a' ? a : prefer === 'b' ? b : newerOf(a, b)
  const o = n === a ? b : a
  const out = clone(n)
  out.workouts = mergeWorkouts(n.workouts, o.workouts).map(clone).sort(byDayStart)
  if (list(n.routines).length || list(o.routines).length) {
    // Sign-in keeps the preferred side's plan as it saved it. A conflict keeps each field
    // from the side that changed it last.
    out.routines = (prefer ? unionById(n.routines, o.routines) : mergeRoutines(n.routines, o.routines)).map(clone)
  }
  if (prefer) {
    if (out.routines && n.deleted?.routines) out.routines = applyRoutineDeletions(out.routines, n.deleted.routines)
  } else {
    const removed = mergeDeletedMap(a.deleted?.routines, b.deleted?.routines)
    if (out.routines) out.routines = applyRoutineDeletions(out.routines, removed)
    if (removed) out.deleted = { ...(out.deleted || {}), routines: removed }
  }
  for (const f of ['customEx', 'equipProfiles', 'gymCards']) {
    if (list(n[f]).length || list(o[f]).length) out[f] = unionById(n[f], o[f]).map(clone)
  }
  out.bodyweight = mergeBodyweight(n.bodyweight, o.bodyweight).map(clone)
  if (list(n.measurements).length || list(o.measurements).length || list(n.customMeasurements).length || list(o.customMeasurements).length) {
    out.measurements = [...list(o.measurements), ...list(n.measurements)]
    out.customMeasurements = unionById(n.customMeasurements, o.customMeasurements).map(clone)
    if (n.measurementEnabled || o.measurementEnabled) out.measurementEnabled = n.measurementEnabled || o.measurementEnabled
    normalizeMeasurementsState(out)
  }
  if (list(n.healthDays).length || list(o.healthDays).length) {
    out.healthDays = mergeHealthDays(o.healthDays, n.healthDays)
  }
  if (list(n.favEx).length || list(o.favEx).length) out.favEx = [...new Set([...list(n.favEx), ...list(o.favEx)])]
  out.exWeights = clone(mergeExWeights(n.exWeights, o.exWeights))
  if (n.dayForm || o.dayForm) out.dayForm = clone(mergeDayForm(n.dayForm, o.dayForm))
  for (const f of ['exNotes', 'barWeights']) {
    if (n[f] || o[f]) out[f] = clone({ ...(o[f] || {}), ...(n[f] || {}) })
  }
  if (o.exMerged && typeof o.exMerged === 'object') {
    const map = { ...(out.exMerged || {}) }
    for (const [k, v] of Object.entries(o.exMerged)) {
      if (!map[k] || (Number(v?._ts) || 0) > (Number(map[k]?._ts) || 0)) map[k] = clone(v)
    }
    out.exMerged = map
  }
  if (o.exAliases && typeof o.exAliases === 'object') {
    const al = { ...(out.exAliases || {}) }
    for (const [k, v] of Object.entries(o.exAliases)) {
      const have = Array.isArray(al[k]) ? [...al[k]] : []
      const seen = new Set(have.map(x => String(x).toLocaleLowerCase()))
      for (const name of Array.isArray(v) ? v : []) {
        if (typeof name !== 'string' || !name.trim() || seen.has(name.toLocaleLowerCase())) continue
        seen.add(name.toLocaleLowerCase())
        have.push(name)
      }
      if (have.length) al[k] = have
    }
    out.exAliases = al
  }
  // A merge recorded on either copy: a workout or custom exercise that still uses the old name
  // moves to where that exercise went.
  applyExerciseMerges(out)
  out._ts = Math.max(a._ts || 0, b._ts || 0)
  delete out._rev
  return out
}

// What `local` holds that `server` does not: the workouts and weigh-ins a device logged while it
// was signed out, and the custom exercises they use. Sign-in asks about these before the server's
// profile replaces the local copy; zero of each means there is nothing to ask about.
export function localExtras(local, server) {
  const have = new Set(list(server?.workouts).map(workoutKey))
  const days = new Set(list(server?.bodyweight).map(e => e?.d))
  const ex = new Set(list(server?.customEx).map(e => e?.id))
  return {
    workouts: list(local?.workouts).filter(w => !have.has(workoutKey(w))).length,
    bodyweight: list(local?.bodyweight).filter(e => e && e.d != null && !days.has(e.d)).length,
    customEx: list(local?.customEx).filter(e => e && !ex.has(e.id)).length
  }
}
