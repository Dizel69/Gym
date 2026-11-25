// Body weight in the volume of bodyweight lifts. A pull-up otherwise reads 0 kg.
// Only volume follows this. Records, estimated 1RM and progression keep the logged load.
import { EXIDX, isAssisted } from './exercises.js'
import { readingAt, readingsOf } from './weigh-ins.js'

/** On unless the profile has turned it off. */
export const countsBodyweight = S => S?.volumeBodyweight !== false

// How much of the body one rep moves. Unknown movements add nothing: a crunch is not a pull-up.
// Hanging and dipping move the whole body. A push-up moves the share measured on the hands
// (Ebben et al. 2011): 64% standard, 49% on the knees, 41% hands raised, 74% feet raised.
const SKIP = /stretch|form check|scapular|\bhold\b|\bassist(ed)?\b|\bbench\b|\bfloor\b|\bwall\b|reverse (push|dip)|handstand|\bpike\b/i
const PATTERNS = [
  [/\b(pull[- ]?ups?|chin[- ]?ups?|muscle[- ]?ups?)\b/i, 1],
  [/\bdips?\b/i, 1],
  [/push[- ]?ups?.*\bknees?\b|\bknees?\b.*push[- ]?ups?/i, 0.49],
  [/\bincline\b.*push[- ]?ups?/i, 0.41],
  [/\bdecline\b.*push[- ]?ups?/i, 0.74],
  [/push[- ]?ups?/i, 0.64],
]
const BODY_EQ = new Set(['body weight', 'weighted', 'suspension trainer', 'rope'])

/**
 * The share of body weight one rep moves, and whether the logged weight comes off (an assistance
 * machine) or goes on (a belt). Null when this exercise adds nothing.
 */
export function bodyLoadOf(idOrEx) {
  const raw = typeof idOrEx === 'string' ? EXIDX[idOrEx] : idOrEx
  const ex = raw?.n ? raw : (raw?.id && EXIDX[raw.id]) || raw
  if (!ex || ex.bp === 'cardio') return null
  const name = String(ex.n || '')
  const assisted = isAssisted(ex)
  if (!assisted && (!BODY_EQ.has(ex.eq) || SKIP.test(name))) return null
  const plain = assisted ? name.replace(/\bassist(ed)?\b/gi, '') : name
  if (assisted && SKIP.test(plain)) return null
  const hit = PATTERNS.find(([re]) => re.test(plain))
  return hit ? { share: hit[1], assisted } : null
}

/**
 * The body weight a session was done at: the one checked in for it, else the weigh-in nearest
 * its start. 0 when there is none.
 */
export function bodyweightFor(w, S) {
  const own = Number(w?.bw)
  if (own > 0) return own
  const pts = []
  for (const day of Array.isArray(S?.bodyweight) ? S.bodyweight : []) {
    for (const r of readingsOf(day)) {
      const t = readingAt(day.d, r.at)
      if (Number(r.w) > 0 && Number.isFinite(t)) pts.push({ t, w: Number(r.w) })
    }
  }
  if (!pts.length) return 0
  pts.sort((a, b) => a.t - b.t)
  const at = Number.isFinite(Number(w?.start)) ? Number(w.start) : new Date(String(w?.d || '') + 'T12:00:00').getTime()
  if (!Number.isFinite(at)) return pts[pts.length - 1].w
  let lo = 0
  let hi = pts.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (pts[mid].t < at) lo = mid + 1
    else hi = mid
  }
  const prev = pts[lo - 1]
  return prev && at - prev.t <= pts[lo].t - at ? prev.w : pts[lo].w
}
