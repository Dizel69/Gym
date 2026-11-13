import { uid } from './format.js'
import { modeOf, defaultConfig, isPerSide } from './history.js'
import { isSideSet, isWarmupRow, hasCompletedWork, modeForEntry } from './workout-model.js'

// How many planned sets a count of logged work rows stands for. A per-side timed hold is one
// left row and one right row per set, so a copy must not read two rows as two sets.
const setsFromRows = (cfg, rows) => {
  const n = Math.max(0, Number(rows) || 0)
  return modeOf(cfg) === 'time' && isPerSide(cfg) ? Math.ceil(n / 2) : n
}

function groupIds(ex) {
  const next = ex.map(entry => ({ ...entry }))
  let i = 0
  while (i < next.length) {
    const raw = next[i].sg
    if (raw == null || raw === '') { delete next[i].sg; i++; continue }
    const start = i
    while (i + 1 < next.length && next[i + 1].sg === raw) i++
    const end = i
    if (end === start) delete next[start].sg
    else {
      const mapped = `sg-${uid()}`
      for (let j = start; j <= end; j++) next[j].sg = mapped
    }
    i++
  }
  return next
}

const scalarGroup = value => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value)
  return text ? text : null
}

const finite = value => Number.isFinite(Number(value)) ? Number(value) : null
const positive = value => {
  const n = finite(value)
  return n != null && n > 0 ? n : null
}

// A flat per-side routine stores the total across both limbs. An odd logged total is rounded
// to the nearest even total the plan can split again.
function perSideReps(row, target) {
  if (!isSideSet(row)) return positive(row?.r)
  const done = ['L', 'R'].filter(key => row.sides[key]?.done === true)
  if (done.length === 1) return evenTotal(target?.reps) ?? evenTotal(row.sides[done[0]]?.r)
  if (done.length < 2) return null
  return evenTotal(done.reduce((total, key) => total + (positive(row.sides[key]?.r) || 0), 0))
}

function evenTotal(value) {
  const n = positive(value)
  return n == null ? null : Math.max(2, 2 * Math.round(n / 2))
}

function perSideWeight(row) {
  if (!isSideSet(row)) return finite(row?.w)
  const done = ['L', 'R'].filter(key => row.sides[key]?.done === true)
  const weights = done.map(key => finite(row.sides[key]?.w)).filter(value => value != null)
  return weights.length ? Math.max(...weights) : null
}

function copiedEntry(entry, source) {
  const rows = Array.isArray(entry?.sets) ? entry.sets : []
  const work = rows.filter(row => !isWarmupRow(row))
  const row = work.filter(candidate => candidate?.done === true).at(-1) || null
  const target = entry?.target && typeof entry.target === 'object'
    ? structuredClone(entry.target)
    : {}
  const defaults = defaultConfig(entry?.id, modeForEntry(entry, modeOf({ ...target, id: entry?.id })))
  const cfg = {
    ...defaults,
    ...target,
    id: entry?.id,
    sets: Math.max(1, setsFromRows({ ...defaults, ...target }, work.length) || 1),
    warmupSets: rows.filter(isWarmupRow).length,
  }
  const mode = modeOf(cfg)
  if (mode === 'time' && row) Object.assign(cfg, { sec: row.sec ?? cfg.sec, weight: row.w ?? cfg.weight ?? 0 })
  else if (mode === 'cardio' && row) Object.assign(cfg, { min: row.min ?? cfg.min, speed: row.speed ?? cfg.speed })
  else if (mode === 'reps') {
    const reps = row && isPerSide(cfg) ? perSideReps(row, cfg) : positive(row?.r)
    if (reps != null) cfg.reps = reps
    if (row) {
      const weight = perSideWeight(row)
      if (weight != null) cfg.weight = weight
    }
    if (isPerSide(cfg) && row == null) cfg.reps = evenTotal(cfg.reps) ?? cfg.reps
  }
  const planned = entry?.planned && typeof entry.planned === 'object' ? entry.planned : null
  if (planned) {
    cfg.sets = Math.max(1, positive(planned.sets) || 1)
    if (mode === 'reps' && positive(planned.reps) != null) {
      cfg.reps = planned.reps
      if (positive(planned.repsMin) != null) cfg.repsMin = planned.repsMin
      else delete cfg.repsMin
    }
    if (mode === 'time' && positive(planned.sec) != null) cfg.sec = planned.sec
  }
  if (!cfg.prog && typeof source?.prog === 'string' && source.prog) cfg.prog = source.prog
  const sg = scalarGroup(entry?.sg ?? target.sg)
  if (sg) cfg.sg = sg
  else delete cfg.sg
  for (const key of SESSION_ONLY) delete cfg[key]
  return cfg
}

const SESSION_ONLY = ['planned', 'plan', 'carried', 'rid', 'noProg', 'muscleSnapshot', 'rowReps', 'addedInSession']

const sessionEntries = session => Array.isArray(session?.entries) ? session.entries : []

// An exercise added in the middle of a routine's session is stamped `addedInSession`.
// Finishing offers to keep it in that routine. Nothing is written unless the offer is taken.
// A swap keeps its slot and is not an addition. A skipped exercise was not part of the workout.
export function routineAdditions(active, routines = []) {
  const groups = new Map()
  for (const entry of sessionEntries(active)) {
    if (entry?.addedInSession !== true || !entry.rid || !(entry.sets || []).some(hasCompletedWork)) continue
    const routine = (Array.isArray(routines) ? routines : []).find(r => r?.id === entry.rid)
    if (!routine || !Array.isArray(routine.ex) || routine.ex.some(x => x?.id === entry.id)) continue
    if (!groups.has(routine.id)) groups.set(routine.id, { routine, entries: [] })
    const list = groups.get(routine.id).entries
    if (!list.some(e => e.id === entry.id)) list.push(entry)
  }
  return [...groups.values()].map(({ routine, entries }) => ({
    routineId: routine.id, name: routine.name, ex: groupIds(entries.map(e => copiedEntry(e, routine))),
  }))
}

/** Append those exercises to the routine, skipping any it already has. Returns how many. */
export function addToRoutine(routine, ex) {
  if (!routine || !Array.isArray(routine.ex)) return 0
  const fresh = (Array.isArray(ex) ? ex : []).filter(cfg => cfg?.id != null && !routine.ex.some(x => x?.id === cfg.id))
  routine.ex.push(...groupIds(fresh.map(cfg => structuredClone(cfg))))
  return fresh.length
}
