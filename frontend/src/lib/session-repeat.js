// "Repeat today": a saved workout's exercises, in its order and with its supersets, as a new
// session dated today. The source record stays what was logged that day.
//
// Rows are seeded from that workout, so a later session of the same exercise does not sneak
// in. Weight is the exception the plan asked for: when the exercise has a progression rule,
// today's rows open at the weight that rule would prescribe. Where the rule is off, or the
// exercise is in no routine, the weight logged that day stays.
import { EXIDX } from './exercises.js'
import { routineFromSession } from './session-routines.js'
import { buildSets, applyIntensifierPlan, modeOf, isPerSide } from './history.js'
import { isWarmupRow, isSideSet, syncSideAggregate } from './workout-model.js'
import { policyFor, sessionPrescription, weightIncrement, defaultIncrement } from './progression.js'

const sourceEntries = w => (Array.isArray(w?.entries) ? w.entries : []).filter(entry => entry?.sets?.length)

const setsFromRows = (cfg, rows) => {
  const n = Math.max(0, Number(rows) || 0)
  return modeOf(cfg) === 'time' && isPerSide(cfg) ? Math.ceil(n / 2) : n
}

function planExercise(st, source) {
  const routines = Array.isArray(st?.routines) ? st.routines : []
  const reps = Number(source?.target?.repsTop) || Number(source?.target?.reps) || 0
  const match = routine => (routine?.ex || []).find(ex =>
    ex?.id === source?.id && (!(reps > 0) || !(Number(ex.reps) > 0) || Number(ex.reps) === reps))
  if (source?.rid) {
    const routine = routines.find(r => r?.id === source.rid)
    const cfg = routine && match(routine)
    if (cfg) return { routine, cfg }
  }
  for (const routine of routines) {
    const cfg = match(routine)
    if (cfg && policyFor(cfg, routine) !== 'off') return { routine, cfg }
  }
  return null
}

function prescribedWeight(st, source) {
  const found = planExercise(st, source)
  if (!found) return null
  if (policyFor(found.cfg, found.routine) === 'off') return null
  const next = sessionPrescription(st, found.cfg, found.routine)
  const weight = Number(next?.weight)
  return next && next.policy !== 'off' && Number.isFinite(weight) ? weight : null
}

function withWeight(sets, weight) {
  return sets.map(set => {
    if (isWarmupRow(set)) return set
    if (isSideSet(set)) {
      const sides = Object.fromEntries(['L', 'R'].map(side => [side, { ...set.sides[side], w: weight }]))
      return syncSideAggregate({ ...set, sides })
    }
    return { ...set, w: weight }
  })
}

/**
 * @returns {{ entries: object[], skipped: number }} today's entries, every row unchecked,
 *   and how many exercises were left out because they no longer exist.
 */
export function repeatSessionEntries(st, w, { exists = id => !!EXIDX[id] } = {}) {
  const src = sourceEntries(w)
  let ex
  try { ex = routineFromSession(w, w?.name, st?.routines).ex }
  catch { return { entries: [], skipped: 0 } }
  const entries = []
  let skipped = 0
  ex.forEach((copied, i) => {
    const source = src[i]
    if (!exists(copied.id)) { skipped++; return }
    const { sg, ...setup } = copied
    const done = setsFromRows(setup, (source?.sets || []).filter(row => row?.done && !isWarmupRow(row)).length)
    const cfg = { ...setup, ...(done ? { sets: done } : {}) }
    const step = modeOf(cfg) === 'reps' ? weightIncrement(cfg, st?.unit) : defaultIncrement(cfg.id, st?.unit)
    const only = { ...st, workouts: [{ ...w, entries: [source] }] }
    let sets = buildSets(only, cfg, { step, preferLast: true })
    const weight = prescribedWeight(st, source)
    if (weight != null) sets = withWeight(sets, weight)
    sets = applyIntensifierPlan(sets, cfg).map(row => ({ ...row, done: false }))
    for (const key of ['note', 'notePin', 'rid', 'planned', 'noProg', 'carried']) delete cfg[key]
    entries.push({ id: cfg.id, ...(sg ? { sg } : {}), target: { ...cfg }, plan: null, sets })
  })
  return { entries: regroup(entries), skipped }
}

function regroup(entries) {
  return entries.map((entry, i) => {
    if (!entry.sg) return entry
    const paired = entries[i - 1]?.sg === entry.sg || entries[i + 1]?.sg === entry.sg
    if (paired) return entry
    const { sg, ...rest } = entry
    return rest
  })
}
