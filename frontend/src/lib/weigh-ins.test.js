import { describe, expect, it } from 'vitest'
import { addWeighIn, allReadings, dailyValue, mergeDay, readingsOf, removeWeighIn, settleAll } from './weigh-ins.js'

const day = () => ({ bodyweight: [], bwDaily: 'first' })

describe('several weigh-ins a day', () => {
  it('keeps every reading and mirrors the first one onto the day', () => {
    const S = day()
    addWeighIn(S, { d: '2026-11-07', at: '07:10', w: 80.1, t: 1 })
    addWeighIn(S, { d: '2026-11-07', at: '21:40', w: 81.4, t: 2 })
    expect(S.bodyweight).toHaveLength(1)
    expect(S.bodyweight[0].w).toBe(80.1)
    expect(readingsOf(S.bodyweight[0]).map(r => r.w)).toEqual([80.1, 81.4])
    expect(allReadings(S.bodyweight)).toHaveLength(2)
  })

  it('uses the average or the last reading when that is the daily value', () => {
    const S = { bodyweight: [], bwDaily: 'avg' }
    addWeighIn(S, { d: '2026-11-07', at: '07:00', w: 80, t: 1 }, 'avg')
    addWeighIn(S, { d: '2026-11-07', at: '21:00', w: 82, t: 2 }, 'avg')
    expect(S.bodyweight[0].w).toBe(81)
    S.bwDaily = 'last'
    settleAll(S, 'last')
    expect(S.bodyweight[0].w).toBe(82)
    expect(dailyValue(readingsOf(S.bodyweight[0]), 'first')).toBe(80)
  })

  it('corrects a reading at the same time instead of adding another', () => {
    const S = day()
    addWeighIn(S, { d: '2026-11-07', at: '08:00', w: 80, t: 1 })
    addWeighIn(S, { d: '2026-11-07', at: '08:00', w: 79.5, t: 2 })
    expect(readingsOf(S.bodyweight[0])).toHaveLength(1)
    expect(S.bodyweight[0].w).toBe(79.5)
  })

  it('drops one reading and the whole day only when it was the last', () => {
    const S = day()
    addWeighIn(S, { d: '2026-11-07', at: '07:00', w: 80, t: 1, id: 'a' })
    addWeighIn(S, { d: '2026-11-07', at: '21:00', w: 81, t: 2, id: 'b' })
    removeWeighIn(S, '2026-11-07', 'b', 3)
    expect(S.bodyweight[0].w).toBe(80)
    removeWeighIn(S, '2026-11-07', 'a', 4)
    expect(S.bodyweight).toEqual([])
  })

  it('reads an old one-a-day weigh-in as a single reading', () => {
    expect(readingsOf({ d: '2026-11-01', w: 77, t: Date.parse('2026-11-01T08:30:00') })[0]).toMatchObject({ id: '0', w: 77 })
  })

  it('merges the readings of one day from two devices', () => {
    const merged = mergeDay(
      { d: '2026-11-07', w: 80, t: 1, ins: [{ id: 'a', at: '07:00', w: 80, t: 1 }] },
      { d: '2026-11-07', w: 81, t: 2, ins: [{ id: 'b', at: '21:00', w: 81, t: 2 }] },
    )
    expect(readingsOf(merged).map(r => r.id)).toEqual(['a', 'b'])
    expect(merged.w).toBe(80)
  })
})
