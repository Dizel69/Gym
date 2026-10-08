import { describe, it, expect } from 'vitest'
import { cycleSlot, scheduleFor, anchorFor } from './week-cycle.js'
import { effectiveRoutineIds, nextTrainingDay } from './history.js'

const routines = [
  { id: 'a', name: 'A', ex: [{ id: '1' }] },
  { id: 'b', name: 'B', ex: [{ id: '2' }] },
]

describe('two-week cycle', () => {
  const S = {
    weekStart: 1,
    weekCycle: 2,
    weekAnchor: '2026-09-21', // Monday, week 1
    week: { 1: ['a'] },
    weekB: { 1: ['b'] },
    routines,
    dayPlan: {},
  }

  it('keeps the anchor week on week 1 and the next Monday on week 2', () => {
    expect(cycleSlot(S, '2026-09-21')).toBe(0)
    expect(cycleSlot(S, '2026-09-23')).toBe(0)
    expect(cycleSlot(S, '2026-09-28')).toBe(1)
    expect(cycleSlot(S, '2026-10-05')).toBe(0)
    expect(scheduleFor(S, '2026-09-21')[1]).toEqual(['a'])
    expect(scheduleFor(S, '2026-09-28')[1]).toEqual(['b'])
  })

  it('resolves the planned routine from the week that date falls in', () => {
    expect(effectiveRoutineIds(S, '2026-09-21')).toEqual(['a'])
    expect(effectiveRoutineIds(S, '2026-09-28')).toEqual(['b'])
  })

  it('a one-week profile ignores week B', () => {
    const one = { ...S, weekCycle: 1 }
    expect(effectiveRoutineIds(one, '2026-09-28')).toEqual(['a'])
  })

  it('looks into the other week for the next session', () => {
    const restThisWeek = { ...S, week: {}, weekB: { 1: ['b'] } }
    const next = nextTrainingDay(restThisWeek, '2026-09-21')
    expect(next.iso).toBe('2026-09-28')
    expect(next.routine.id).toBe('b')
  })

  it('anchors a new cycle on the current week start', () => {
    expect(anchorFor({ weekStart: 1 }, '2026-09-23')).toBe('2026-09-21')
  })
})
