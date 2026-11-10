// Strength level per lift: Beginner, Novice, Intermediate, Advanced or Elite, from the best
// estimated 1RM against the latest weigh-in. Worked out on this device. No weigh-in, no level.
//
// The thresholds are bodyweight ratios (1RM ÷ body weight) at the start of each level, per lift
// and sex, rounded from the published Strength Level tables. Dumbbell lifts are per dumbbell,
// which is the weight logged for one bell. Sex comes from Settings → body. A lifter under the
// first line is not called a beginner: the next step is that first line.
import { best1RM } from './onerm.js'
import { lastBW } from './history.js'

export const LEVELS = ['beginner', 'novice', 'intermediate', 'advanced', 'elite']
export const LEVEL_NAME = {
  below: 'Below the table',
  beginner: 'Beginner lifter',
  novice: 'Novice lifter',
  intermediate: 'Intermediate lifter',
  advanced: 'Advanced lifter',
  elite: 'Elite lifter',
}

// [Beginner, Novice, Intermediate, Advanced, Elite] as a multiple of body weight.
export const STANDARDS = {
  // Camera angles and the rack shot are the same lift. A full squat filmed from behind
  // was otherwise invisible next to the front-view id.
  squat: { ids: ['0043', '3593', '1461', '1462', '0878'], m: [0.75, 1.25, 1.5, 2.25, 2.75], f: [0.5, 0.75, 1.25, 1.5, 2] },
  bench: { ids: ['0025', '6813'], m: [0.5, 0.75, 1, 1.5, 2], f: [0.25, 0.5, 0.75, 1, 1.5] },
  deadlift: { ids: ['0032', '0117', '0967', '6692'], m: [1, 1.5, 2, 2.5, 3], f: [0.5, 1, 1.25, 1.75, 2.5] },
  press: { ids: ['1162'], m: [0.35, 0.55, 0.8, 1.05, 1.35], f: [0.2, 0.35, 0.5, 0.75, 1] },
  row: { ids: ['0027'], m: [0.5, 0.75, 1, 1.5, 1.75], f: [0.25, 0.4, 0.65, 0.9, 1.2] },
  frontSquat: { ids: ['0042'], m: [0.55, 0.8, 1.2, 1.6, 2], f: [0.35, 0.55, 0.85, 1.15, 1.5] },
  incline: { ids: ['0047'], m: [0.4, 0.65, 0.85, 1.2, 1.5], f: [0.2, 0.4, 0.6, 0.85, 1.1] },
  rdl: { ids: ['0085'], m: [0.6, 1, 1.4, 1.9, 2.4], f: [0.4, 0.65, 1, 1.4, 1.8] },
  hipThrust: { ids: ['1060'], m: [0.5, 1, 1.75, 2.5, 3.25], f: [0.5, 1, 1.5, 2.25, 3] },
  curl: { ids: ['0031'], m: [0.2, 0.4, 0.6, 0.85, 1.15], f: [0.1, 0.2, 0.4, 0.6, 0.85] },
  // Incline and the flat press share this per-bell table: the catalogue splits them,
  // and there is no second published line for the incline.
  dbBench: { ids: ['0289', '0314', '3545'], perBell: true, m: [0.2, 0.35, 0.5, 0.75, 1], f: [0.1, 0.2, 0.35, 0.5, 0.7] },
  // Seated "bench press", neutral grip and the standing press are the same overhead press.
  dbPress: { ids: ['0405', '0290', '0404', '0426', '0414'], perBell: true, m: [0.15, 0.25, 0.4, 0.6, 0.8], f: [0.1, 0.15, 0.25, 0.4, 0.55] },
  // Both arms together, standing, or one arm at a time: the same curl.
  dbCurl: { ids: ['0294', '0416', '0285', '1196', '3761'], perBell: true, m: [0.1, 0.2, 0.3, 0.45, 0.6], f: [0.05, 0.1, 0.2, 0.3, 0.4] },
}
const BY_ID = Object.fromEntries(Object.entries(STANDARDS).flatMap(([k, v]) => v.ids.map(id => [id, k])))

/** The lift an exercise is graded as, or null when it has no standard. */
export const liftOf = exId => BY_ID[exId] || null

/** Women's table when Settings → body is female. Anything else uses the men's table. */
export const sexOf = S => (S?.body === 'female' ? 'female' : 'male')

export function thresholdsFor(lift, sex) {
  const st = STANDARDS[lift]
  if (!st) return null
  return sex === 'female' ? st.f : st.m
}

/** Index of the highest line the ratio has reached, or -1 when it is still under the first. */
export function levelAt(ratio, thresholds) {
  let lv = -1
  thresholds.forEach((t, i) => { if (ratio >= t - 1e-9) lv = i })
  return lv
}

function nextWeight(ratio, bw) {
  const raw = ratio * bw
  return Math.ceil(raw * 2 - 1e-9) / 2
}

/** The estimated 1RM that opens each level at this lifter's body weight. */
export function levelWeights(lv) {
  if (!lv?.thresholds || !(lv.bw > 0)) return []
  return LEVELS.map((name, i) => ({
    name,
    ratio: lv.thresholds[i],
    weight: nextWeight(lv.thresholds[i], lv.bw),
    reached: i <= lv.level,
  }))
}

/**
 * The level of exercise `exId`, or null when it has no standard, no estimated 1RM or no weigh-in.
 * `next` is the level above and the estimated 1RM that reaches it (null at Elite).
 */
export function strengthLevel(S, exId) {
  const lift = liftOf(exId)
  if (!lift) return null
  const bw = Number(lastBW({ bodyweight: S?.bodyweight || [] })?.w)
  if (!(bw > 0)) return null
  const st = STANDARDS[lift]
  const best = best1RM(S, exId)
  if (!best || !(best.est > 0)) return null
  const sex = sexOf(S)
  const th = thresholdsFor(lift, sex)
  const ratio = best.est / bw
  const level = levelAt(ratio, th)
  const name = level < 0 ? 'below' : LEVELS[level]
  const next = level < LEVELS.length - 1
    ? { level: level + 1, name: LEVELS[level + 1], ratio: th[level + 1], weight: nextWeight(th[level + 1], bw) }
    : null
  return {
    lift, level, name, ratio: Math.round(ratio * 100) / 100, e1rm: best.est, bw, next,
    sex, perBell: !!st.perBell, thresholds: th, id: exId,
  }
}

/** Every graded lift the profile has a level for, strongest first. Aliases keep the better ratio. */
export function strengthLevels(S) {
  const out = []
  for (const [lift, st] of Object.entries(STANDARDS)) {
    let best = null
    for (const id of st.ids) {
      const lv = strengthLevel(S, id)
      if (lv && (!best || lv.ratio > best.ratio)) best = lv
    }
    if (best) out.push(best)
  }
  const order = Object.keys(STANDARDS)
  return out.sort((a, b) => b.level - a.level || b.ratio - a.ratio || order.indexOf(a.lift) - order.indexOf(b.lift))
}
