import { describe, expect, test, afterEach } from 'vitest'
import { checkinMode, dailyFormSource, formScore, goLighter, isRough, lighterWeight, registerDailyFormSource, withForm } from './daily-form.js'
import { deloadSuggestion, setDailyFormSource } from './deload-cycle.js'

const work = w => ({ w, r: 5, done: false })
const session = () => ({
  unit: 'kg',
  routines: [{ id: 'r', ex: [{ id: '0025', weight: 100, sets: 3 }] }],
  active: {
    entries: [{
      id: '0025',
      target: { id: '0025', reps: 5, inc: 2.5 },
      sets: [
        { w: 50, r: 5, done: false, phase: 'warmup', warmup: true },
        work(100), work(100), work(100),
      ],
    }],
  },
})

describe('daily form', () => {
  afterEach(() => setDailyFormSource(null))

  test('the check-in stays off until it is switched on, and a rough day is two low answers', () => {
    expect(checkinMode({}, '2026-11-26')).toBe(null)
    expect(checkinMode({ dailyForm: true }, '2026-11-26')).toBe('ask')
    const rough = { sleep: 1, energy: 2, sore: null, stress: null }
    expect(formScore(rough)).toBe(1.5)
    expect(isRough(rough)).toBe(true)
    expect(isRough({ sleep: 5, energy: null, sore: null, stress: null })).toBe(false)
    expect(formScore({ sore: 5, stress: 5 })).toBe(1)
  })

  test('10% lighter snaps down onto the step and leaves the plan and the progression alone until chosen', () => {
    expect(lighterWeight(100, 2.5)).toBe(90)
    expect(lighterWeight(60, 2.5)).toBe(52.5)
    const s = session()
    expect(goLighter(s, 'load')).toBe(1)
    expect(s.active.entries[0].sets.map(x => x.w)).toEqual([45, 90, 90, 90])
    expect(s.active.noProg).toBe(true)
    expect(s.active.entries[0].noProg).toBe(true)
    expect(s.routines[0].ex[0].weight).toBe(100)
  })

  test('one set fewer drops the last open work set and a warm-up that was not a choice stays', () => {
    const s = session()
    expect(goLighter(s, 'sets')).toBe(1)
    expect(s.active.entries[0].sets).toHaveLength(3)
    expect(s.active.entries[0].sets[0].w).toBe(50)
    expect(s.active.lighter).toBe('sets')
  })

  test('an unticked choice changes nothing, and two tired weeks offer a deload without moving a weight', () => {
    const s = session()
    expect(goLighter(s, 'nope')).toBe(0)
    expect(s.active.noProg).toBeUndefined()
    const days = ['2026-11-13', '2026-11-16', '2026-11-20', '2026-11-25']
    let map = {}
    for (const d of days) map = withForm(map, d, { sleep: 1, energy: 2, sore: 5, stress: 4 }, 1)
    const S = {
      dayForm: map,
      workouts: ['2026-11-05', '2026-11-20'].flatMap(d => ['0025', '0043'].map(id => ({
        d, entries: [{ id, sets: [{ w: 100, r: 5, done: true }] }],
      }))),
    }
    registerDailyFormSource()
    expect(dailyFormSource(S, '2026-11-13', '2026-11-26')).toHaveLength(4)
    const idea = deloadSuggestion(S, '2026-11-26')
    expect(idea?.reason).toBe('form')
    expect(S.workouts[0].entries[0].sets[0].w).toBe(100)
  })
})
