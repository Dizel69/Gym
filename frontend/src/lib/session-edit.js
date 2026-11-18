// Editing a workout that is already in history. The editor is the ordinary workout screen
// working on a copy in S.active (`editingWorkoutId` says whose). The saved record stays as it
// was until Save. Date and duration are not edited here: the history card has its own rows.
import { buildCompletedWorkout } from './finish-workout.js'
import { beatsWeight } from './exercises.js'
import { bestWeightForEntry, workoutVolume } from './history.js'
import { hasCompletedWork } from './workout-model.js'
import { stampWorkout } from './sync-merge.js'
import { legacySyncKey, rebuildPrHistory } from './workout-date.js'

const clone = value => structuredClone(value)
const list = v => (Array.isArray(v) ? v : [])
const keyOf = w => (w?.id != null ? w.id : legacySyncKey(w))

const SESSION_FIELDS = ['note', 'name', 'bw']
const sessionField = (w, k) => (k === 'note' ? (w?.note || '').trim() : (w?.[k] ?? null))

function sameData(a, b) {
  if (a === b) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false
  const keys = o => Object.keys(o).filter(k => o[k] !== undefined)
  const ka = keys(a)
  return ka.length === keys(b).length && ka.every(k => sameData(a[k], b[k]))
}
const DERIVED = ['id', 'vol', 'prs', '_ts']
const savedData = w => Object.fromEntries(Object.entries(w).filter(([k]) => !DERIVED.includes(k)))
// topW is derived from the sets, and a null the editor fills in is not a change the user made.
const comparable = w => {
  const drop = v => {
    if (Array.isArray(v)) return v.map(drop)
    if (v && typeof v === 'object') {
      const out = {}
      for (const [k, val] of Object.entries(v)) {
        if (k === 'topW' || val == null) continue
        const next = drop(val)
        if (Array.isArray(next) && !next.length) continue
        out[k] = next
      }
      return out
    }
    return v
  }
  return drop(savedData(w))
}

function bestIn(workout, id) {
  let best = 0
  for (const e of list(workout?.entries)) {
    if (e?.id !== id) continue
    const w = bestWeightForEntry(e)
    if (beatsWeight(id, w, best)) best = w
  }
  return best
}

function lowerKeptWeights(state, ids, current, saved) {
  for (const id of ids) {
    const kept = state.exWeights?.[id]
    const before = bestIn(current, id)
    if (!kept || !(kept.w > 0) || kept.w !== before || !beatsWeight(id, before, bestIn(saved, id))) continue
    let best = null
    for (const w of state.workouts) {
      const top = bestIn(w, id)
      if (beatsWeight(id, top, best?.w || 0)) best = { w: top, d: w.d }
    }
    if (best) state.exWeights[id] = best
    else delete state.exWeights[id]
  }
}

// A remembered best that came from this session moves up with it. One confirmed somewhere
// else ("next time starts at…") is left alone, the same way a lowering leaves it alone.
function raiseKeptWeights(state, ids, current, saved) {
  if (!saved) return
  if (!state.exWeights) state.exWeights = {}
  for (const id of ids) {
    const after = bestIn(saved, id)
    if (!(after > 0)) continue
    const before = bestIn(current, id)
    const kept = state.exWeights[id]
    if (kept && (kept.w !== before || !beatsWeight(id, after, before))) continue
    state.exWeights[id] = { w: after, d: saved.d }
  }
}

export const editLeftEmpty = active => !list(active?.entries).some(entry => list(entry?.sets).some(hasCompletedWork))

export function editCompletedSession(state, ref) {
  if (state.active) throw new Error('Finish the current workout first.')
  const key = ref && typeof ref === 'object' ? keyOf(ref) : ref
  const original = key == null ? null : list(state.workouts).find(w => keyOf(w) === key)
  if (!original) throw new Error('Workout deleted')
  const active = clone(original)
  active.cur = 0
  active.editingWorkoutId = key
  active.editBase = Object.fromEntries(SESSION_FIELDS.map(k => [k, sessionField(original, k)]))
  if (original.excludeFromProgression === true) {
    for (const entry of list(active.entries)) if (entry && entry.noProg !== true) entry.noProg = true
    active.noProg = true
  }
  for (const k of ['vol', 'prs', '_ts']) delete active[k]
  delete active.media
  state.active = active
  return active
}

export function saveWorkoutEdit(state, now = Date.now()) {
  const active = state.active
  const key = active?.editingWorkoutId
  const index = key == null ? -1 : list(state.workouts).findIndex(w => keyOf(w) === key)
  if (index < 0) throw new Error('This workout was deleted on another device. Your edits are still here.')
  if (editLeftEmpty(active)) throw new Error('Nothing logged yet')
  const current = state.workouts[index]
  const record = draftRecord(active, current, key)
  if (sameData(comparable(record), comparable(current))) {
    state.active = null
    return current
  }
  record.vol = workoutVolume(record)
  stampWorkout(record, now)
  state.workouts[index] = record
  const touched = [...new Set([...list(current.entries), ...record.entries].map(e => e?.id).filter(id => id != null))]
  state.workouts = rebuildPrHistory(state.workouts, touched, record)
  const saved = state.workouts.find(w => keyOf(w) === key)
  lowerKeptWeights(state, touched, current, saved)
  raiseKeptWeights(state, touched, current, saved)
  state.active = null
  return saved
}

export function editChangesNothing(state) {
  const active = state?.active
  const key = active?.editingWorkoutId
  if (key == null || editLeftEmpty(active)) return false
  const current = list(state.workouts).find(w => keyOf(w) === key)
  if (!current) return false
  return sameData(comparable(draftRecord(active, current, key)), comparable(current))
}

function draftRecord(active, current, key) {
  const updated = buildCompletedWorkout(active, {
    end: current.end,
    prs: current.prs || [],
    snapshotFor: entry => entry.muscleSnapshot,
  })
  const logged = active.entries.filter(entry => entry.sets.some(hasCompletedWork))
  updated.entries = updated.entries.map((entry, i) => {
    const merged = { ...clone(logged[i]), ...entry }
    delete merged.plan
    delete merged.carried
    for (const k of ['note', 'notePin', 'noProg', 'muscleSnapshot', 'rid', 'planned']) if (!(k in entry)) delete merged[k]
    return merged
  })
  const record = { ...current, ...updated, id: key, d: current.d, start: current.start, end: current.end }
  if (!('excludeFromProgression' in updated)) delete record.excludeFromProgression
  const base = active.editBase
  for (const k of SESSION_FIELDS) {
    const edited = !base || sessionField(updated, k) !== base[k]
    const value = edited ? sessionField(updated, k) : current[k]
    if (value == null || value === '') delete record[k]
    else record[k] = value
  }
  return record
}

export function editedRecord(state) {
  const key = state?.active?.editingWorkoutId
  return key == null ? null : list(state.workouts).find(w => keyOf(w) === key) || null
}

export function deleteEditedWorkout(state) {
  const current = editedRecord(state)
  state.active = null
  if (!current) return false
  state.workouts = state.workouts.filter(w => w !== current)
  lowerKeptWeights(state, [...new Set(list(current.entries).map(e => e?.id).filter(id => id != null))], current, null)
  return true
}
