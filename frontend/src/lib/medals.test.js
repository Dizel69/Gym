import { describe, expect, it } from 'vitest'
import { medalCase } from './medals.js'

const now = new Date(2026, 10, 8, 12)

function month(ym, n, volume, records) {
  return Array.from({ length: n }, (_, i) => ({
    id: ym + '-' + i,
    d: ym + '-' + String(Math.min(i + 1, 28)).padStart(2, '0'),
    prs: i === 0 ? Array.from({ length: records }, () => '0025') : [],
    entries: [{ id: '0025', sets: [{ w: i === 0 ? volume : 0, r: 1, done: true }] }],
  }))
}

describe('medalCase', () => {
  it('shows rewards from the first month that earned a medal', () => {
    expect(medalCase({ workouts: [] }, now)).toBeNull()
    const box = medalCase({ workouts: month('2026-11', 4, 1000, 1) }, now)
    expect(box.champions).toEqual([
      { id: 'workouts', ym: '2026-11', value: 4, tier: 1 },
      { id: 'volume', ym: '2026-11', value: 1000, tier: 1 },
      { id: 'records', ym: '2026-11', value: 1, tier: 1 },
    ])
    expect(box.shelf).toEqual([])
  })

  it('replaces a medal only when the later month is higher, and keeps a shelf medal for a full clear', () => {
    const S = {
      workouts: [
        ...month('2026-06', 4, 10000, 1),
        ...month('2026-07', 6, 20000, 3),
        ...month('2026-08', 8, 35000, 3),
        ...month('2026-09', 10, 30000, 3),
        ...month('2026-10', 12, 30000, 3),
        ...month('2026-11', 15, 32000, 3),
      ],
    }
    const box = medalCase(S, now)
    expect(box.champions).toEqual([
      { id: 'workouts', ym: '2026-11', value: 15, tier: 6 },
      { id: 'volume', ym: '2026-08', value: 35000, tier: 3 },
      { id: 'records', ym: '2026-07', value: 3, tier: 2 },
    ])
    expect(box.shelf.map(medal => medal.ym)).toEqual([
      '2026-11', '2026-10', '2026-09', '2026-08', '2026-07',
    ])
  })

  it('leaves the shelf empty when one goal of the month is missed', () => {
    const box = medalCase({
      workouts: [
        ...month('2026-10', 10, 20000, 2),
        ...month('2026-11', 12, 10000, 0),
      ],
    }, now)
    expect(box.champions[0]).toMatchObject({ ym: '2026-11', value: 12, tier: 2 })
    expect(box.champions[1]).toMatchObject({ ym: '2026-10', value: 20000, tier: 1 })
    expect(box.shelf).toEqual([])
  })
})
