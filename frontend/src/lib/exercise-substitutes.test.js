import { describe, expect, it } from 'vitest'
import { EXDB, EXIDX } from './exercises.js'
import { SUBSTITUTE_FAMILIES, suggestedSubstitutes, sameTypeSubstitutes, swapSuggestions } from './exercise-substitutes.js'
import { sameMuscleFirst } from './similar-exercises.js'

describe('sameMuscleFirst', () => {
  it('keeps the same target muscle, drops the exercise itself, same equipment first', () => {
    const ex = { id: 'x', tg: 'triceps', eq: 'cable' }
    const list = [
      { id: 'a', tg: 'triceps', eq: 'dumbbell' },
      { id: 'x', tg: 'triceps', eq: 'cable' },
      { id: 'b', tg: 'biceps', eq: 'cable' },
      { id: 'c', tg: 'triceps', eq: 'cable' },
      { id: 'd', tg: 'triceps', eq: 'barbell' },
      { id: 'e', tg: 'triceps', eq: 'cable' }
    ]
    expect(sameMuscleFirst(list, ex).map(e => e.id)).toEqual(['c', 'e', 'a', 'd'])
    expect(sameMuscleFirst(list, { id: 'y' })).toEqual([])
  })
})

describe('reviewed substitutes', () => {
  it('has unique, existing catalogue IDs and keeps the same movement', () => {
    const ids = Object.values(SUBSTITUTE_FAMILIES).flat()
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter(id => !EXIDX[id])).toEqual([])
    const candidates = ['0025', '0308', '0405', '0289', '0662'].map(id => EXIDX[id])
    expect(suggestedSubstitutes(candidates, EXIDX['0025']).map(e => e.id)).toEqual(['0289', '0662'])
  })

  it('preserves the list order and stops at three', () => {
    const ordered = ['0662', '0289', '0748', '0576'].map(id => EXIDX[id])
    expect(suggestedSubstitutes(ordered, EXIDX['0025']).map(e => e.id)).toEqual(['0662', '0289', '0748'])
  })

  it('does not guess a movement for unknown, custom or missing metadata', () => {
    expect(suggestedSubstitutes(EXDB, { id: 'custom', n: 'bench press', tg: 'pectorals', cat: 'strength' })).toEqual([])
    expect(suggestedSubstitutes(EXDB, { ...EXIDX['0025'], custom: true })).toEqual([])
    expect(suggestedSubstitutes(EXDB, null)).toEqual([])
    expect(suggestedSubstitutes(EXDB, { id: '0025' })).toEqual([])
  })

  it('falls back to the same muscle and the same type when the movement is unmapped', () => {
    const ex = EXIDX['5055']
    expect(suggestedSubstitutes(EXDB, ex)).toEqual([])
    const typed = sameTypeSubstitutes(EXDB, ex)
    expect(typed).toHaveLength(3)
    expect(typed.every(e => e.tg === 'lats' && e.cat === 'stretching' && e.id !== ex.id)).toBe(true)
    expect(sameTypeSubstitutes(EXDB, { tg: 'lats' })).toEqual([])
    expect(sameTypeSubstitutes(EXDB, null)).toEqual([])
    expect(swapSuggestions(EXDB, ex).kind).toBe('type')
  })

  it('prefers the movement family over other work for the same muscle', () => {
    const picked = swapSuggestions(EXDB, EXIDX['0025'])
    expect(picked.kind).toBe('movement')
    expect(picked.items).toHaveLength(3)
    expect(picked.items.every(e => SUBSTITUTE_FAMILIES['flat press'].includes(e.id) && e.id !== '0025')).toBe(true)
  })
})
