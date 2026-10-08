import { describe, expect, it } from 'vitest'
import { fatigueOf } from './recovery.js'
import { recommendToday } from './recommend.js'

const NOW = Date.UTC(2026, 0, 1, 12)
const LEGS = { id: 'legs', name: 'Ноги', ex: [{ n: 'barbell squat', bp: 'upper legs', tg: 'quads', sm: ['glutes', 'hamstrings'] }] }
const PUSH = { id: 'push', name: 'Верх', ex: [{ n: 'barbell bench press', bp: 'chest', tg: 'pectorals', sm: ['triceps'] }] }

function walk(minutes) {
  return {
    start: NOW,
    d: '2026-01-01',
    entries: [{ id: 'walk', n: 'brisk walk', bp: 'cardio', tg: 'cardiovascular system', sets: [{ done: true, min: minutes }] }],
  }
}

describe('recommendToday', () => {
  it('sends a person with tired legs to a complex that leaves them alone', () => {
    const fatigue = fatigueOf([walk(30)], NOW)
    expect(fatigue.quadriceps).toBeGreaterThan(0.5)
    const advice = recommendToday({ routines: [LEGS, PUSH], fatigue })
    expect(advice.avoid).toContain('legs')
    expect(advice.routineId).toBe('push')
    expect(advice.blocked).toBe(false)
  })

  it('does not treat a short stroll as a reason to skip legs', () => {
    const fatigue = fatigueOf([walk(10)], NOW)
    expect(fatigue.quadriceps).toBeLessThan(0.5)
    const advice = recommendToday({ routines: [LEGS, PUSH], fatigue })
    expect(advice.avoid).not.toContain('legs')
  })

  it('says rest when every saved complex trains the tired region', () => {
    const fatigue = fatigueOf([walk(30)], NOW)
    const advice = recommendToday({ routines: [LEGS], fatigue })
    expect(advice.routineId).toBe(null)
    expect(advice.blocked).toBe(true)
    expect(advice.avoid).toContain('legs')
  })

  it('picks a saved complex when nothing is tired', () => {
    const advice = recommendToday({ routines: [LEGS, PUSH], fatigue: {} })
    expect(advice.avoid).toEqual([])
    expect(advice.routineId).toBe('legs')
    expect(advice.blocked).toBe(false)
  })

  it('prefers the complex that trains a muscle whose strength has faded', () => {
    const strength = { chest: 0.5, quadriceps: 1, gluteal: 1, hamstring: 1 }
    const advice = recommendToday({ routines: [LEGS, PUSH], fatigue: {}, strength })
    expect(advice.routineId).toBe('push')
  })

  it('returns nothing when there is no complex to suggest', () => {
    expect(recommendToday({ routines: [], fatigue: {} })).toBe(null)
  })
})
