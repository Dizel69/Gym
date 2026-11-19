import { describe, expect, it } from 'vitest'
import { buildWidgetSnapshot } from './widgets.js'
import { _setLangState } from './i18n-core.js'

const bench = { id: 'r1', name: 'Жим', ex: [{ id: '0025' }] }
const state = (over = {}) => ({
  unit: 'kg', accent: 'lime', theme: 'dark', weekStart: 1,
  routines: [bench], week: { 4: ['r1'] }, dayPlan: {}, workouts: [], bodyweight: [], targetW: null,
  ...over,
})

describe('home screen widget snapshot', () => {
  it('names today while that workout is still to do, and the day after once it is logged', () => {
    const open = buildWidgetSnapshot(state(), { today: '2026-11-19' })
    expect(open.days[0]).toMatchObject({ iso: '2026-11-19', name: 'Жим', done: false })
    const done = buildWidgetSnapshot(state({
      workouts: [{ id: 'w', d: '2026-11-19', routineIds: ['r1'] }],
    }), { today: '2026-11-19' })
    expect(done.days.find(d => d.iso === '2026-11-19').done).toBe(true)
    expect(done.days.find(d => d.name && d.iso > '2026-11-19').iso).toBe('2026-11-26')
  })

  it('says how much is left to the goal, and keeps the last weigh-ins for the curve', () => {
    const snap = buildWidgetSnapshot(state({
      targetW: 80,
      bodyweight: [
        { d: '2026-11-01', w: 84 },
        { d: '2026-11-10', w: 83 },
        { d: '2026-11-18', w: 82.4 },
      ],
    }), { today: '2026-11-19' })
    expect(snap.weight.dir).toBe('lose')
    expect(snap.weight.toGo).toBe(2.4)
    expect(snap.weight.trend).toEqual([84, 83, 82.4])
  })

  it('has nothing to chase when there is no goal, and nothing to show without a weigh-in', () => {
    expect(buildWidgetSnapshot(state({ bodyweight: [{ d: '2026-11-18', w: 82 }] })).weight.dir).toBe('none')
    expect(buildWidgetSnapshot(state()).weight.dir).toBe('empty')
  })

  it('marks a reached goal', () => {
    const snap = buildWidgetSnapshot(state({
      targetW: 80, bodyweight: [{ d: '2026-11-18', w: 80 }],
    }))
    expect(snap.weight.dir).toBe('there')
  })

  it('lists the weeks that count toward the streak, Monday first', () => {
    const snap = buildWidgetSnapshot(state({
      workouts: [
        { d: '2026-11-12' },
        { d: '2026-11-19' },
      ],
    }), { today: '2026-11-19' })
    expect(snap.weekStart).toBe(1)
    expect(snap.weeks).toEqual(['2026-11-09', '2026-11-16'])
  })

  it('uses the Russian week word', () => {
    _setLangState('ru', { 'in a row': 'подряд' }, null, null, null)
    try {
      const snap = buildWidgetSnapshot(state(), { today: '2026-11-19' })
      expect(snap.words.one).toBe('неделя')
      expect(snap.words.few).toBe('недели')
      expect(snap.words.many).toBe('недель')
      expect(snap.words.row).toBe('подряд')
    } finally {
      _setLangState('en', {}, null, null, null)
    }
  })
})
