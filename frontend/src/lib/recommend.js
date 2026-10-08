// What to train today: avoid muscles that are still fatigued, and among the saved
// complexes pick the one whose main work lands on the fresher ones.
//
// A muscle counts as tired above the same 0.5 line the body map paints red.
// Secondary involvement (a bench press brushing the front delt) does not by
// itself rule a complex out.

import { EXIDX } from './exercises.js'
import { MUSCLES, musclesOf } from './muscles.js'

export const FATIGUE_AVOID = 0.5
const PRIMARY = 0.5

export const REGIONS = [
  { id: 'legs', name: 'Legs', muscles: ['gluteal', 'quadriceps', 'hamstring', 'adductors', 'hip-flexors', 'calves', 'tibialis'] },
  { id: 'back', name: 'the back', muscles: ['trapezius', 'upper-back', 'lower-back'] },
  { id: 'chest', name: 'Chest', muscles: ['chest', 'serratus'] },
  { id: 'shoulders', name: 'Shoulders', muscles: ['front-deltoid', 'side-deltoid', 'rear-deltoid'] },
  { id: 'arms', name: 'Arms', muscles: ['biceps', 'triceps', 'forearm'] },
  { id: 'core', name: 'Core', muscles: ['abs', 'obliques'] },
]

function exerciseOf(item) {
  return EXIDX[item?.id] || item?.ex || item
}

export function routineLoad(routine) {
  const load = {}
  for (const item of routine?.ex || []) {
    for (const [slug, weight] of Object.entries(musclesOf(exerciseOf(item)))) {
      if (!MUSCLES.includes(slug)) continue
      load[slug] = Math.max(load[slug] || 0, weight)
    }
  }
  return load
}

function peak(fatigue, muscles) {
  return Math.max(0, ...muscles.map(slug => fatigue[slug] || 0))
}

export function tiredRegions(fatigue = {}) {
  return REGIONS.filter(region => peak(fatigue, region.muscles) > FATIGUE_AVOID).map(region => region.id)
}

function trainsTired(load, fatigue) {
  return Object.entries(load).some(([slug, weight]) => weight >= PRIMARY && (fatigue[slug] || 0) > FATIGUE_AVOID)
}

function scoreOf(load, fatigue, strength) {
  let score = 0
  for (const [slug, weight] of Object.entries(load)) {
    if (weight < PRIMARY) continue
    if ((fatigue[slug] || 0) > FATIGUE_AVOID) score -= 10
    else score += 1 + (1 - (strength?.[slug] ?? 1))
  }
  return score
}

/**
 * @returns {{ routineId: string|null, routineName: string|null, avoid: string[], blocked: boolean } | null}
 * `avoid` is region ids. `blocked` means every saved complex still trains a tired region.
 */
export function recommendToday({ routines, fatigue = {}, strength = {} }) {
  const list = (routines || []).filter(routine => (routine.ex || []).length)
  if (!list.length) return null
  const avoid = tiredRegions(fatigue)
  const ranked = list.map((routine, index) => {
    const load = routineLoad(routine)
    return { routine, index, hits: trainsTired(load, fatigue), score: scoreOf(load, fatigue, strength) }
  }).sort((a, b) => b.score - a.score || a.index - b.index)
  const pick = ranked.find(row => !row.hits && row.score > 0) || null
  return {
    routineId: pick ? pick.routine.id : null,
    routineName: pick ? pick.routine.name : null,
    avoid,
    blocked: !pick && avoid.length > 0,
  }
}
