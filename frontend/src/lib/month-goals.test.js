import { describe, expect, it } from 'vitest'
import { monthGoals } from './month-goals.js'

const now = new Date(2026, 10, 8, 12)

function month(ym, n, volume, records) {
  return Array.from({ length: n }, (_, i) => ({
    id: ym + '-' + i,
    d: ym + '-' + String(Math.min(i + 1, 28)).padStart(2, '0'),
    prs: i === 0 ? Array.from({ length: records }, () => '0025') : [],
    entries: [{
      id: '0025',
      sets: [{ w: i === 0 ? volume : 0, r: 1, done: true }],
    }],
  }))
}

const history = [
  ...month('2026-08', 12, 40000, 2),
  ...month('2026-09', 16, 60000, 4),
  ...month('2026-10', 14, 50000, 3),
]

describe('monthGoals', () => {
  it('stays quiet until a past month has a workout', () => {
    expect(monthGoals({ workouts: [] }, now)).toBeNull()
    expect(monthGoals({ workouts: month('2026-11', 4, 1000, 1) }, now)).toBeNull()
  })

  it('sets 14 workouts, 50 t and 3 records from the last three months', () => {
    const goals = monthGoals({
      workouts: [...history, ...month('2026-11', 2, 8000, 1)],
    }, now)
    expect(goals.ym).toBe('2026-11')
    expect(goals.months).toBe(3)
    expect(goals.goals).toEqual([
      { id: 'workouts', target: 14, value: 2 },
      { id: 'volume', target: 50000, value: 8000 },
      { id: 'records', target: 3, value: 1 },
    ])
  })

  it('does not let this month raise its own target', () => {
    const quiet = monthGoals({ workouts: history }, now)
    const huge = monthGoals({ workouts: [...history, ...month('2026-11', 40, 200000, 20)] }, now)
    expect(huge.goals.map(g => g.target)).toEqual(quiet.goals.map(g => g.target))
    expect(huge.goals.find(g => g.id === 'workouts').value).toBe(40)
  })

  it('skips an empty month and leaves a zero record average off the card', () => {
    const goals = monthGoals({
      workouts: [...month('2026-07', 10, 1000, 0), ...month('2026-09', 8, 1000, 0)],
    }, now)
    expect(goals.months).toBe(2)
    expect(goals.goals.map(g => g.id)).toEqual(['workouts', 'volume'])
    expect(goals.goals[0].target).toBe(9)
  })

  it('leaves warm-ups out of the tonnage', () => {
    const goals = monthGoals({
      workouts: [{
        id: 'a', d: '2026-10-02', prs: [],
        entries: [{ id: '0025', sets: [
          { w: 40, r: 10, done: true, phase: 'warmup' },
          { w: 100, r: 5, done: true },
        ] }],
      }],
    }, now)
    expect(goals.goals.find(g => g.id === 'volume').target).toBe(500)
  })

  it('starts a new game when the month changes', () => {
    const december = monthGoals({
      workouts: [...history, ...month('2026-11', 20, 70000, 6)],
    }, new Date(2026, 11, 1, 12))
    expect(december.ym).toBe('2026-12')
    expect(december.goals.find(g => g.id === 'workouts')).toEqual({ id: 'workouts', target: 17, value: 0 })
    expect(december.goals.find(g => g.id === 'volume').target).toBe(60000)
    expect(december.goals.find(g => g.id === 'records').target).toBe(4)
  })
})
