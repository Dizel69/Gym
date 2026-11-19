/* A routine merged field by field, not as one blob.
 *
 * A weight saved on the phone and a name saved on the computer are different fields (`ex` and
 * `name`). Each one remembers when it changed (`_f`). The merge keeps the later one. A copy from
 * before field stamps has only `editedAt` (or `_ts`): that time covers every field, so an old
 * whole save still beats an older copy, as it always did.
 *
 * A removal is `deleted.routines[id]`. It wins over a copy last edited before it, so the other
 * device does not bring the routine back. An edit stamped after the removal keeps it. A negative
 * stamp is an add-back and wins a tie with a removal at the same instant.
 *
 * No imports on purpose: the API image carries this file next to server.js, and the app imports
 * the same file. */

const clone = o => JSON.parse(JSON.stringify(o))
const list = v => (Array.isArray(v) ? v : [])
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const META = new Set(['id', '_ts', '_f', '_u', 'editedAt'])

export const routineTime = routine => {
  const ts = Number(routine?._ts)
  if (Number.isFinite(ts) && ts > 0) return ts
  const at = Number(routine?.editedAt)
  return Number.isFinite(at) && at > 0 ? at : 0
}

/** When field `key` was last changed. No `_f` at all means the whole routine was saved at once. */
export function routineFieldTime(routine, key) {
  const stamped = Number(routine?._f?.[key]) || 0
  if (stamped > 0) return stamped
  if (isMap(routine?._f) && Object.keys(routine._f).length) return 0
  return routineTime(routine)
}

const sameRoutine = (a, b) => JSON.stringify(strip(a)) === JSON.stringify(strip(b))
const strip = r => {
  const o = { ...r }
  for (const k of META) delete o[k]
  return o
}

/**
 * `next` is the new version of `old`, edited at `now`. Stamps `_ts`, `editedAt`, and every field
 * that differs. A new routine gets the time only. Mutates and returns `next`.
 */
export function stampRoutineFields(old, next, now) {
  if (!next || typeof next !== 'object') return next
  next._ts = now
  next.editedAt = now
  if (!old || typeof old !== 'object') { delete next._f; return next }
  const f = isMap(old._f) ? { ...old._f } : {}
  for (const k of new Set([...Object.keys(old), ...Object.keys(next)])) {
    if (META.has(k)) continue
    if ((k in old) !== (k in next) || JSON.stringify(old[k]) !== JSON.stringify(next[k])) f[k] = now
  }
  if (Object.keys(f).length) next._f = f
  else delete next._f
  return next
}

/** The later stamp of each field. On a tie, `a` keeps the field. A new object. */
export function mergeRoutine(a, b) {
  if (!a) return b ? clone(b) : b
  if (!b) return clone(a)
  const [n, o] = routineTime(b) > routineTime(a) ? [b, a] : [a, b]
  const out = clone(n)
  const f = {}
  for (const src of [a, b]) {
    if (!isMap(src?._f)) continue
    for (const [k, v] of Object.entries(src._f)) if ((Number(v) || 0) >= (Number(f[k]) || 0)) f[k] = v
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (META.has(k)) continue
    const ta = routineFieldTime(a, k), tb = routineFieldTime(b, k)
    if (tb === ta) continue
    const src = tb > ta ? b : a
    if (k in src) out[k] = clone(src[k])
    else delete out[k]
  }
  if (Object.keys(f).length) out._f = f
  else delete out._f
  const ts = Math.max(routineTime(a), routineTime(b))
  if (ts) { out._ts = ts; out.editedAt = ts }
  return out
}

/** Newer list's order, then ids only the older list has. A shared id is merged field by field. */
export function mergeRoutineList(newer = [], older = []) {
  const olderBy = new Map()
  for (const routine of list(older)) {
    if (routine?.id != null && !olderBy.has(routine.id)) olderBy.set(routine.id, routine)
  }
  const seen = new Set()
  const out = []
  for (const routine of list(newer)) {
    if (routine?.id == null) { out.push(routine); continue }
    if (seen.has(routine.id)) continue
    seen.add(routine.id)
    const prev = olderBy.get(routine.id)
    out.push(prev ? mergeRoutine(routine, prev) : routine)
  }
  for (const routine of list(older)) {
    if (routine?.id == null || seen.has(routine.id)) continue
    seen.add(routine.id)
    out.push(routine)
  }
  return out
}

const laterDel = (v, cur) => {
  const x = Number(v) || 0, y = Number(cur) || 0
  return Math.abs(x) > Math.abs(y) || (Math.abs(x) === Math.abs(y) && x < y)
}

export function mergeDeletedMap(a, b) {
  const x = isMap(a) ? a : {}, y = isMap(b) ? b : {}
  const m = { ...x }
  for (const [k, v] of Object.entries(y)) if (!(k in m) || laterDel(v, m[k])) m[k] = v
  return Object.keys(m).length ? m : null
}

/** Drop a routine whose removal is stamped at or after its own edit. */
export function applyRoutineDeletions(routines, deleted) {
  if (!isMap(deleted)) return list(routines)
  return list(routines).filter(routine => {
    if (routine?.id == null) return true
    const at = Number(deleted[String(routine.id)]) || 0
    return !(at > 0 && at >= routineTime(routine))
  })
}

/** The latest stamp a copy carries that a plan edit has to come after. */
export function highestPlanStamp(S) {
  let m = 0
  const see = v => { const n = Math.abs(Number(v) || 0); if (n > m) m = n }
  if (!S || typeof S !== 'object') return 0
  see(S._ts)
  if (isMap(S.deleted?.routines)) for (const v of Object.values(S.deleted.routines)) see(v)
  for (const r of list(S.routines)) {
    see(routineTime(r))
    if (isMap(r?._f)) for (const v of Object.values(r._f)) see(v)
  }
  return m
}

/**
 * Stamps routines the change from `prev` to `next` touched, and records routines it removed, at
 * one time that comes after every stamp `prev` already carries. A clock that runs behind still
 * lands after the copy this device has seen. Mutates `next`.
 */
export function stampPlanChange(prev, next, wall = Date.now()) {
  if (!next || typeof next !== 'object') return next
  const now = Math.max(Number(wall) || 0, highestPlanStamp(prev) + 1)
  const before = new Map(list(prev?.routines).filter(r => r?.id != null).map(r => [r.id, r]))
  const after = new Set()
  for (const r of list(next.routines)) {
    if (!r || r.id == null) continue
    after.add(r.id)
    const old = before.get(r.id)
    if (old && sameRoutine(old, r)) continue
    stampRoutineFields(old, r, now)
  }
  const had = new Set(before.keys())
  let removed = false
  const del = isMap(next.deleted) ? { ...next.deleted } : {}
  const m = isMap(del.routines) ? { ...del.routines } : {}
  for (const [id, old] of before) {
    if (after.has(id)) continue
    m[String(id)] = Math.max(now, routineTime(old) + 1)
    removed = true
  }
  for (const id of after) {
    if (had.has(id)) continue
    const k = String(id)
    if (Number(m[k]) > 0) { m[k] = -now; removed = true }
  }
  if (removed) { del.routines = m; next.deleted = del }
  next._ts = now
  return next
}

/**
 * What the server stores when a push meets the plan it already has. Shared ids merge field by
 * field. A removal either side recorded drops a routine edited before it. `changed` means the
 * stored document is not the push: the client has to take this copy back.
 */
export function settlePushedRoutines(stored, pushed, storedDeleted, pushedDeleted) {
  const deletedRoutines = mergeDeletedMap(storedDeleted?.routines, pushedDeleted?.routines)
  const storedBy = new Map()
  for (const routine of list(stored)) {
    if (routine?.id != null && !storedBy.has(routine.id)) storedBy.set(routine.id, routine)
  }
  const merged = list(pushed).map(routine => {
    if (!routine || routine.id == null) return routine
    const prev = storedBy.get(routine.id)
    return prev ? mergeRoutine(prev, routine) : routine
  })
  const routines = applyRoutineDeletions(merged, deletedRoutines)
  const deleted = isMap(pushedDeleted) || isMap(storedDeleted)
    ? { ...(isMap(storedDeleted) ? storedDeleted : {}), ...(isMap(pushedDeleted) ? pushedDeleted : {}) }
    : null
  if (deleted && deletedRoutines) deleted.routines = deletedRoutines
  else if (deleted) delete deleted.routines
  const changed = JSON.stringify(routines) !== JSON.stringify(list(pushed))
    || JSON.stringify(deleted || null) !== JSON.stringify(isMap(pushedDeleted) ? pushedDeleted : null)
  return { routines, deleted, changed }
}
