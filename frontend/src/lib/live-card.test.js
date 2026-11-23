import { describe, expect, it } from 'vitest'
import { fmtNum } from './format.js'
import { isCarryName, liveBpm, liveCardModel, liveKind } from './live-card.js'

describe('live card kind', () => {
  it('keeps a sled leg press as a lift and a farmer as a carry', () => {
    expect(isCarryName('sled 45° leg press')).toBe(false)
    expect(isCarryName('sledge hammer')).toBe(false)
    expect(isCarryName('dumbbell farmers carry')).toBe(true)
    expect(isCarryName('power sled push')).toBe(true)
    expect(isCarryName('power sled biceps curl')).toBe(false)
    expect(liveKind('Bench Press', { mode: 'reps' }, { w: 80, r: 8 })).toBe('lift')
    expect(liveKind('Run', { mode: 'cardio', id: 'x' }, { min: 20, speed: 8 })).toBe('cardio')
    expect(liveKind('Plank', { mode: 'time' }, { sec: 45 })).toBe('hold')
    expect(liveKind('Farmers walk', { mode: 'reps' }, { w: 32, r: 20 })).toBe('carry')
    expect(liveKind('Walk', { mode: 'distance' }, { m: 40, w: 32 })).toBe('carry')
  })

  it('accepts a pulse and drops a number that cannot be one', () => {
    expect(liveBpm(142)).toBe(142)
    expect(liveBpm(142.4)).toBe(142)
    expect(liveBpm(10)).toBe(null)
    expect(liveBpm(300)).toBe(null)
  })
})

describe('live card text', () => {
  it('shows weight × reps for a lift', () => {
    const card = liveCardModel({
      name: 'Bench Press',
      set: { w: 80, r: 8 },
      cfg: { mode: 'reps' },
      done: 2,
      total: 12,
    })
    expect(card.kind).toBe('lift')
    expect(card.title).toBe('Bench Press')
    expect(card.body).toBe(`${fmtNum(80)} × 8`)
    expect(card.chip).toBe(`${fmtNum(80)}×8`)
    expect(card.actions.map(a => a.id)).toEqual(['log', 'weight', 'reps'])
  })

  it('shows minutes, speed, incline and the pulse for cardio', () => {
    const card = liveCardModel({
      name: 'Run',
      set: { min: 20, speed: 8, incline: 2 },
      cfg: { mode: 'cardio' },
      bpm: 142,
      done: 0,
      total: 1,
    })
    expect(card.kind).toBe('cardio')
    expect(card.body).toContain(`${fmtNum(20)} min @ ${fmtNum(8)} km/h`)
    expect(card.body).toContain(`${fmtNum(2)}%`)
    expect(card.body).toContain('142 bpm')
    expect(card.chip).toBe('142')
    expect(card.actions.map(a => a.id)).toEqual(['log', 'pause'])
  })

  it('shows metres and the load for a carry', () => {
    const card = liveCardModel({
      name: 'Farmers walk',
      set: { m: 40, w: 32, r: 1 },
      cfg: { mode: 'reps' },
      unit: 'kg',
      done: 1,
      total: 3,
    })
    expect(card.kind).toBe('carry')
    expect(card.body).toBe(`${fmtNum(40)} m · ${fmtNum(32)} kg`)
    expect(card.chip).toBe(`${fmtNum(40)}m`)
    expect(card.actions.map(a => a.id)).toEqual(['log', 'weight', 'pause'])
  })

  it('shows the load without a times sign when a carry has no metres yet', () => {
    const card = liveCardModel({
      name: 'Farmers walk',
      set: { w: 32, r: 20 },
      cfg: { mode: 'reps' },
      unit: 'kg',
    })
    expect(card.body).toBe(`${fmtNum(32)} kg · ${fmtNum(20)}`)
    expect(card.body.includes('×')).toBe(false)
  })

  it('puts the pace under the rest and the seconds on the chip', () => {
    const card = liveCardModel({
      name: 'Run',
      set: { min: 20, speed: 8 },
      cfg: { mode: 'cardio' },
      resting: true,
      restLeft: 45,
      done: 1,
      total: 4,
    })
    expect(card.title).toBe('Rest')
    expect(card.body).toContain('45')
    expect(card.body).toContain('Run')
    expect(card.body).toContain('km/h')
    expect(card.chip).toBe('45s')
    expect(card.actions.map(a => a.id)).toEqual(['log', 'rest', 'pause'])
  })
})
