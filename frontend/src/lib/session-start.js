// How a session's exercise entries are built from a routine. Shared by the live start and by
// "log a past workout", which is the same screen pointed at another day — both must walk up
// to identical entries, or the two paths drift apart the first time a prescription rule changes.
// Imports both history.js and progression.js (which itself imports history.js); nothing in
// either imports this file, so there is no cycle.
import { buildSets, applyIntensifierPlan, modeOf, splitsByReps, lastEntryFor } from './history.js'
import { sessionPrescription, applyPrescription, defaultIncrement, weightIncrement } from './progression.js'
import { isDeloadDay, deloadSets } from './deload-cycle.js'
import { setBandsOf, usesBands } from './bands.js'
import { isWarmupRow } from './workout-model.js'

// Returns a bare array of session entries. "Excluded from progression" is per-entry now
// (`entry.noProg`, written only when true) rather than a wrapper flag — a rehab routine merged
// into real work must exclude only its own exercises. The merge helper (lib/session-merge.js)
// stamps `entry.rid`; this builder is unaware of which routine it serves, so the single-routine
// and combined paths share it unchanged.
function paintLastBands(st, cfg, sets) {
  if (!usesBands(st, cfg.id, cfg)) return
  const last = lastEntryFor(st, cfg.id)
  const prev = (last?.sets || []).filter(s => !isWarmupRow(s))
  if (!prev.length && !cfg.bands) return
  let i = 0
  for (const row of sets) {
    if (isWarmupRow(row)) continue
    const ids = setBandsOf(prev[i] || prev[prev.length - 1]) 
    if (!ids.length && Array.isArray(cfg.bands)) row.bands = cfg.bands.slice()
    else if (ids.length) row.bands = ids
    i++
  }
}

export function buildSessionEntries(st, r) {
  // The prescription is applied as the session is built, so you walk up to the bar with the
  // right weight already on the screen instead of being told about it afterwards. `plan` is
  // kept on the entry purely so the workout can explain the number it chose.
  const noProg = r?.excludeFromProgression === true
  // A deload week keeps the weights and drops about 40% of the work sets. It does not count,
  // so the lighter week neither raises nor lowers the plan.
  const deload = isDeloadDay(st)
  return (r ? r.ex : []).map(cfg => {
    const off = noProg || deload
    const plan = off ? { policy: 'off', kind: 'off' } : sessionPrescription(st, cfg, r)
    // The warm-up ramp and the prescription snap to the exercise's own increment (1.25 kg
    // plates exist), not the unit default; a timed exercise's `inc` is seconds, so it keeps the
    // default for its optional load.
    const step = modeOf(cfg) === 'reps' ? weightIncrement(cfg, st.unit) : defaultIncrement(cfg.id, st.unit)
    const cfgUse = deload ? { ...cfg, sets: deloadSets(cfg.sets || 1) } : cfg
    const sets = applyIntensifierPlan(applyPrescription(buildSets(st, cfgUse, { step, useTarget: plan.kind === 'off' }), plan, step), cfgUse)
    paintLastBands(st, cfg, sets)
    const target = { ...cfgUse }
    // The prescription may move target.reps (a double-progression aim, a deload). The line
    // stays the plan's rep count, so the next session of this target can still find this one.
    if (splitsByReps(cfg)) target.repsTop = Number(cfg.reps)
    if (plan.weight != null) target.weight = plan.weight
    if (plan.reps != null) target.reps = plan.reps
    if (plan.sec != null) target.sec = plan.sec
    if (plan.sets != null && !deload) target.sets = plan.sets
    return { id: cfg.id, sg: cfg.sg, target, plan, sets, ...(off ? { noProg: true } : {}), ...(deload ? { deload: true } : {}) }
  })
}
