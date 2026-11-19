// A workout left running with nobody touching it. The choice lives on this device
// (localStorage), not in the synced profile: a laptop must not finish a phone's session.
//
// After `askMin` of quiet the phone asks "Still training?". Silence for `graceMin` more
// finishes it. The saved end is the last logged set plus the rest that followed it, so a
// forgotten evening stays the length of the work, not the length of the silence.

export const FORGOTTEN_KEY = 'gym_forgotten_v1'
export const REOPEN_KEY = 'gym_reopen_v1'
export const REOPEN_MS = 24 * 60 * 60 * 1000
export const ASK_CHOICES = [0, 30, 45, 60, 90]
export const GRACE_CHOICES = [2, 5, 10]
export const FORGOTTEN_DEFAULTS = { askMin: 45, graceMin: 5 }

const MIN = 60 * 1000
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

function ticked(s) {
  if (!s) return false
  if (s.sides?.L || s.sides?.R) return s.sides.L?.done === true || s.sides.R?.done === true
  return s.done === true
}

export function readForgotten() {
  try {
    const raw = JSON.parse(localStorage.getItem(FORGOTTEN_KEY) || '{}')
    const askMin = ASK_CHOICES.includes(raw.askMin) ? raw.askMin : FORGOTTEN_DEFAULTS.askMin
    const graceMin = GRACE_CHOICES.includes(raw.graceMin) ? raw.graceMin : FORGOTTEN_DEFAULTS.graceMin
    return { askMin, graceMin }
  } catch { return { ...FORGOTTEN_DEFAULTS } }
}

export function writeForgotten(p) {
  const askMin = ASK_CHOICES.includes(p?.askMin) ? p.askMin : FORGOTTEN_DEFAULTS.askMin
  const graceMin = GRACE_CHOICES.includes(p?.graceMin) ? p.graceMin : FORGOTTEN_DEFAULTS.graceMin
  localStorage.setItem(FORGOTTEN_KEY, JSON.stringify({ askMin, graceMin }))
  return { askMin, graceMin }
}

/** The newest logged set and its exercise, or null. */
export function lastSetOf(A) {
  let best = null
  for (const e of A?.entries || []) for (const s of e?.sets || []) {
    const at = Number(s?.at)
    if (ticked(s) && Number.isFinite(at) && at >= 0 && (!best || at > best.at)) best = { at, entry: e, set: s }
  }
  return best
}

/** The rest that would have followed that set: its own, its exercise's, the app's. */
export function usualRestSec(last, restSec = 90) {
  const own = num(last?.set?.rest) || num(last?.entry?.target?.restSec)
  if (own) return own
  if (last?.entry?.target?.restOff) return 0
  return restSec > 0 ? restSec : 0
}

/** What idle time counts from: the last set, the start, a touch, a "Keep going". */
export function idleSince(A, { activeAt = 0, snoozeAt = 0 } = {}) {
  return Math.max(lastSetOf(A)?.at || 0, num(A?.start), num(activeAt), num(snoozeAt))
}

/**
 * When a workout that ended by itself really ended: the last logged set (plus a timed or
 * cardio row's own length) plus the usual rest. Never later than `now`.
 */
export function honestEnd(A, { restSec = 90, now = Date.now() } = {}) {
  const last = lastSetOf(A)
  if (!last) return Math.min(now, num(A?.start) || now)
  const extra = (num(last.set.min) * 60 + num(last.set.sec)) * 1000
  return Math.min(now, last.at + extra + usualRestSec(last, restSec) * 1000)
}

/**
 * The decision for `now`:
 *   none    nothing running, or a saved workout being edited
 *   active  nothing to ask; `askAt` is when the question would come
 *   ask     "Still training?"
 *   end     nobody answered: finish, saved as ending at `endAt`
 * A rest that is counting, or a workout paused on purpose, is not forgotten.
 */
export function decideForgotten({ A, now = Date.now(), prefs = FORGOTTEN_DEFAULTS, askedAt = 0, snoozeAt = 0, activeAt = 0, resting = false, restSec = 90 } = {}) {
  if (!A || A.editingWorkoutId || A.backfill) return { state: 'none' }
  if (num(A.pausedAt)) return { state: 'active' }
  if (resting) return { state: 'active' }
  const since = idleSince(A, { activeAt, snoozeAt })
  const grace = (GRACE_CHOICES.includes(prefs?.graceMin) ? prefs.graceMin : FORGOTTEN_DEFAULTS.graceMin) * MIN
  const end = () => ({ state: 'end', reason: 'idle', endAt: honestEnd(A, { restSec, now }) })
  const askMin = ASK_CHOICES.includes(prefs?.askMin) ? prefs.askMin : FORGOTTEN_DEFAULTS.askMin
  if (!askMin) return { state: 'active' }
  const askAt = since + askMin * MIN
  if (now < askAt) return { state: 'active', askAt }
  const asked = num(askedAt) >= askAt ? num(askedAt) : 0
  if (!asked) return { state: 'ask', reason: 'idle', askAt, deadline: now + grace }
  return now >= asked + grace ? end() : { state: 'ask', reason: 'idle', askAt, deadline: asked + grace }
}

/** Remember a just-finished workout so it can be opened again for a day. */
export function saveReopen(id, at = Date.now()) {
  if (!id) return
  localStorage.setItem(REOPEN_KEY, JSON.stringify({ id, at }))
}

export function readReopen(now = Date.now()) {
  try {
    const o = JSON.parse(localStorage.getItem(REOPEN_KEY) || 'null')
    if (!o?.id || now - num(o.at) > REOPEN_MS) return null
    return o
  } catch { return null }
}

export function clearReopen() {
  try { localStorage.removeItem(REOPEN_KEY) } catch { /* */ }
}
