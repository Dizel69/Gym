// Merge one exercise into another: an import left "Bench Press (Barbell)" as a custom exercise
// next to the catalogue's bench press, and the history belongs on the catalogue one.
//
// Everything that names the exercise moves to the target: logged sets and notes, the workout's
// records, routine slots (and their backups), a programme's per-exercise targets, the kept
// working weight, the standing note, the favourite star, and the per-exercise settings the
// target has none of yet. The source's own name becomes an alias, so searching for it finds
// the target. A custom source is removed. A catalogue source cannot be removed, so it is hidden
// and the alias does the same job.
//
// `S.exMerged` records each merge, `{ [sourceId]: { into, _ts } }`. A workout another device
// logged against the source before it heard of the merge is moved over when the copies meet.
// Undo clears the record (`into: null`) and puts everything back.
import { betterWeight, isCustomEx, EXIDX } from './exercises.js'
import { exerciseMuscleSnapshot } from './muscles.js'
import { exerciseAliases, normalizeAliases } from './exercise-aliases.js'
import { NOTE_MAX } from './history.js'

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const list = v => (Array.isArray(v) ? v : [])
const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)))

// Per-exercise settings maps: the target keeps its own, the source's moves only where it has none.
const MOVE_MAPS = ['barWeights', 'loadKind', 'dbLoad', 'stackWeights', 'exUnit']
// What an Undo puts back whole.
const RESTORE = ['routines', 'programmes', 'customEx', 'exWeights', 'exNotes', 'exAliases', 'favEx', 'balanceOverrides', ...MOVE_MAPS]

/** Where `id` went, following merges of merges; `id` itself when it was never merged. */
export function mergedInto(S, id) {
  const m = isMap(S?.exMerged) ? S.exMerged : {}
  let cur = id
  for (let i = 0; i < 16; i++) {
    const into = m[cur]?.into
    if (!into || into === id) return cur
    cur = into
  }
  return cur
}

/** The ids merged away (catalogue exercises among them are hidden from the lists). */
export function mergedAway(S) {
  const m = isMap(S?.exMerged) ? S.exMerged : null
  if (!m) return null
  const out = new Set()
  for (const [k, v] of Object.entries(m)) if (v && v.into) out.add(k)
  return out.size ? out : null
}

const exOf = (S, id) => list(S?.customEx).find(c => c?.id === id) || EXIDX[id] || null
const entryHas = (w, id) => list(w?.entries).some(e => e?.id === id)
const routineHas = (r, id) => list(r?.ex).some(c => c?.id === id || list(c?.subs).includes(id))
const programmeHas = (p, id) => list(p?.weeks).some(wk => isMap(wk?.t) && Object.keys(wk.t).some(k => k === id || k.endsWith(':' + id)))

/**
 * What a merge of `fromId` into `toId` would move, for the confirm sheet: counts of workouts,
 * logged sets, routines and programmes, and whether a note or aliases come along.
 */
export function mergePreview(S, fromId, toId) {
  const workouts = list(S?.workouts).filter(w => entryHas(w, fromId))
  const sets = workouts.reduce((n, w) => n + list(w.entries).filter(e => e?.id === fromId)
    .reduce((m, e) => m + list(e.sets).filter(s => s?.done).length, 0), 0)
  return {
    workouts: workouts.length,
    sets,
    routines: list(S?.routines).filter(r => routineHas(r, fromId)).length,
    programmes: Object.values(isMap(S?.programmes) ? S.programmes : {}).filter(p => programmeHas(p, fromId)).length,
    note: !!(S?.exNotes?.[fromId] || '').trim(),
    custom: list(S?.customEx).some(c => c?.id === fromId),
    same: fromId === toId,
  }
}

/** Why a merge cannot happen, as an English key for t(), or null when it can. */
export function mergeBlocked(S, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return 'Pick a different exercise.'
  if (mergedInto(S, toId) === fromId) return 'Pick a different exercise.'
  if (!exOf(S, toId)) return 'Pick a different exercise.'
  if (list(S?.active?.entries).some(e => e?.id === fromId)) return 'Finish your current workout first'
  return null
}

// The entry's history snapshot follows the target: a custom target's own muscles and name, none
// for a catalogue one (the catalogue answers for it).
function retarget(e, toId, toEx) {
  e.id = toId
  if (toEx && isCustomEx(toEx)) {
    const snap = exerciseMuscleSnapshot(toEx)
    if (Object.keys(snap).length) e.muscleSnapshot = snap; else delete e.muscleSnapshot
    if (toEx.n) e.n = toEx.n
  } else {
    delete e.muscleSnapshot
    delete e.n
  }
}

/**
 * Every place in `S` that still names `fromId`, moved to `toId`. With `stamp`, each workout it
 * changes is stamped as edited at `now`, and each routine gets `editedAt` so a phone that only
 * logged a session cannot put the old slot back. Without `stamp`, a merged copy is being brought
 * in line (applyExerciseMerges). Returns how many workouts it changed. Mutates `S`.
 */
function redirect(S, fromId, toId, { stamp = false, now = Date.now() } = {}) {
  const toEx = exOf(S, toId)
  let n = 0
  for (const w of list(S.workouts)) {
    if (!entryHas(w, fromId)) continue
    for (const e of list(w.entries)) if (e?.id === fromId) retarget(e, toId, toEx)
    if (Array.isArray(w.prs) && w.prs.includes(fromId)) w.prs = [...new Set(w.prs.map(id => (id === fromId ? toId : id)))]
    if (stamp) w._ts = now
    n++
  }
  for (const r of list(S.routines)) {
    if (!routineHas(r, fromId)) continue
    if (stamp) r.editedAt = now
    r.ex = list(r.ex).map(c => {
      if (!c) return c
      const next = c.id === fromId ? { ...c, id: toId } : { ...c }
      if (Array.isArray(next.subs)) {
        const subs = [...new Set(next.subs.map(id => (id === fromId ? toId : id)))].filter(id => id !== next.id)
        if (subs.length) next.subs = subs; else delete next.subs
      }
      return next
    })
  }
  if (isMap(S.programmes)) {
    for (const [pid, p] of Object.entries(S.programmes)) {
      if (!programmeHas(p, fromId)) continue
      const np = clone(p)
      for (const wk of list(np.weeks)) {
        if (!isMap(wk?.t)) continue
        const t = {}
        for (const [k, v] of Object.entries(wk.t)) {
          const nk = k === fromId ? toId : k.endsWith(':' + fromId) ? k.slice(0, -fromId.length) + toId : k
          if (!(nk in t) || nk === k) t[nk] = v
        }
        wk.t = t
      }
      S.programmes = { ...S.programmes, [pid]: np }
    }
  }
  return n
}

/**
 * Merges `fromId` into `toId` in `S` (a store draft) at `now`. Returns `{ undo }`: what Undo needs
 * to put it all back. Throws with mergeBlocked's reason when it cannot happen.
 */
export function mergeExercise(S, fromId, toId, { now = Date.now(), names = [] } = {}) {
  const blocked = mergeBlocked(S, fromId, toId)
  if (blocked) throw new Error(blocked)
  const fromEx = exOf(S, fromId), toEx = exOf(S, toId)
  const before = {}
  for (const f of RESTORE) before[f] = clone(S[f])
  before.workouts = clone(list(S.workouts).filter(w => entryHas(w, fromId)))
  before.exMerged = clone(S.exMerged?.[fromId] || null)

  redirect(S, fromId, toId, { stamp: true, now })

  const ew = isMap(S.exWeights) ? { ...S.exWeights } : {}
  if (ew[fromId]) {
    const a = Number(ew[fromId]?.w) || 0, b = Number(ew[toId]?.w) || 0
    if (!b || (a && betterWeight(toId, a, b) === a && a !== b)) ew[toId] = { ...ew[fromId] }
    delete ew[fromId]
    S.exWeights = ew
  }
  if (isMap(S.exNotes) && (S.exNotes[fromId] || '').trim()) {
    const notes = { ...S.exNotes }
    const joined = [notes[toId], notes[fromId]].map(x => (x || '').trim()).filter(Boolean)
    notes[toId] = [...new Set(joined)].join('\n').slice(0, NOTE_MAX)
    delete notes[fromId]
    S.exNotes = notes
  }
  {
    const al = isMap(S.exAliases) ? { ...S.exAliases } : {}
    const ownNames = [fromEx?.n, ...names].filter(n => typeof n === 'string' && n.trim())
    const next = normalizeAliases([...exerciseAliases(toEx || { id: toId }, al), ...(fromEx ? exerciseAliases(fromEx, al) : []), ...ownNames])
      .filter(n => n.toLocaleLowerCase() !== String(toEx?.n || '').toLocaleLowerCase())
    if (next.length) al[toId] = next
    delete al[fromId]
    S.exAliases = al
  }
  if (Array.isArray(S.favEx) && S.favEx.includes(fromId)) S.favEx = [...new Set(S.favEx.map(id => (id === fromId ? toId : id)))]
  for (const f of MOVE_MAPS) {
    if (!isMap(S[f]) || !(fromId in S[f])) continue
    const m = { ...S[f] }
    if (!(toId in m) && m[fromId] != null) m[toId] = isMap(m[fromId]) && m[fromId]._ts != null ? { ...m[fromId], _ts: now } : m[fromId]
    delete m[fromId]
    S[f] = m
  }
  if (isMap(S.balanceOverrides)) {
    let touched = false
    const m = {}
    for (const [k, v] of Object.entries(S.balanceOverrides)) {
      if (isMap(v) && v.id === fromId) { m[k] = { ...v, id: toId, _ts: now }; touched = true } else m[k] = v
    }
    if (touched) S.balanceOverrides = m
  }
  if (list(S.customEx).some(c => c?.id === fromId)) {
    const src = S.customEx.find(c => c.id === fromId)
    S.customEx = S.customEx.filter(c => c?.id !== fromId).map(c => (c.id === toId && src?.media && !c.media ? { ...c, media: src.media } : c))
  }
  S.exMerged = { ...(isMap(S.exMerged) ? S.exMerged : {}), [fromId]: { into: toId, _ts: now } }
  return { undo: { fromId, toId, before } }
}

/** Puts a merge back. The record is cleared with a stamp of its own, so a sync keeps the undo. */
export function undoMerge(S, undo, { now = Date.now() } = {}) {
  if (!undo?.before) return
  const { before, fromId } = undo
  for (const f of RESTORE) {
    if (before[f] === undefined) delete S[f]
    else S[f] = clone(before[f])
  }
  const keyOf = w => (w?.id != null ? w.id : `${w?.d}|${w?.start}`)
  const back = new Map(list(before.workouts).map(w => [keyOf(w), w]))
  S.workouts = list(S.workouts).map(w => {
    const old = back.get(keyOf(w))
    if (!old) return w
    const restored = clone(old)
    restored._ts = now
    return restored
  })
  S.exMerged = { ...(isMap(S.exMerged) ? S.exMerged : {}), [fromId]: { into: null, _ts: now } }
}

/**
 * Brings a copy in line with the merges it records. Nothing is stamped: this is the same merge,
 * met again. Returns how many workouts it moved. Mutates `S`.
 */
export function applyExerciseMerges(S) {
  const away = mergedAway(S)
  if (!away) return 0
  let n = 0
  for (const fromId of away) {
    const toId = mergedInto(S, fromId)
    if (!toId || toId === fromId) continue
    n += redirect(S, fromId, toId)
    if (list(S.customEx).some(c => c?.id === fromId)) S.customEx = S.customEx.filter(c => c?.id !== fromId)
  }
  return n
}
