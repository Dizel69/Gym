import { describe, expect, it } from 'vitest'
import { healthDay, healthImportOn, mergeHealthDays, sleepParts } from './health.js'

describe('health days', () => {
  it('keeps a usable row and drops a day with no numbers', () => {
    expect(healthDay({ d: '2026-10-30', steps: 8420.4, sleepMin: 452, activeKcal: 310.2 }))
      .toEqual({ d: '2026-10-30', steps: 8420, sleepMin: 452, activeKcal: 310 })
    expect(healthDay({ d: '2026-10-30' })).toBeNull()
    expect(healthDay({ d: '30.10.2026', steps: 1 })).toBeNull()
    expect(healthDay({ d: '2026-10-30', steps: -3, sleepMin: 'nope' })).toBeNull()
  })

  it('lets a later read replace one number and leave the others', () => {
    const merged = mergeHealthDays(
      [{ d: '2026-10-29', steps: 6000, sleepMin: 430, activeKcal: 280 }],
      [{ d: '2026-10-29', steps: 9100 }, { d: '2026-10-30', activeKcal: 40 }]
    )
    expect(merged).toEqual([
      { d: '2026-10-29', steps: 9100, sleepMin: 430, activeKcal: 280 },
      { d: '2026-10-30', activeKcal: 40 }
    ])
  })

  it('sorts by day and drops the oldest past the cap', () => {
    const merged = mergeHealthDays(
      [{ d: '2026-10-30', steps: 1 }, { d: '2026-10-01', steps: 2 }],
      [{ d: '2026-10-15', steps: 3 }],
      2
    )
    expect(merged.map(d => d.d)).toEqual(['2026-10-15', '2026-10-30'])
  })

  it('treats a missing list as nothing to merge', () => {
    expect(mergeHealthDays(null, undefined)).toEqual([])
    expect(mergeHealthDays([{ d: '2026-10-30', steps: 5 }], null)).toEqual([{ d: '2026-10-30', steps: 5 }])
  })

  it('imports unless the settings switch is explicitly off', () => {
    expect(healthImportOn({})).toBe(true)
    expect(healthImportOn({ healthImport: true })).toBe(true)
    expect(healthImportOn({ healthImport: false })).toBe(false)
  })

  it('splits sleep into hours and minutes', () => {
    expect(sleepParts(452)).toEqual({ h: 7, m: 32 })
    expect(sleepParts(120)).toEqual({ h: 2, m: 0 })
    expect(sleepParts(40)).toEqual({ h: 0, m: 40 })
    expect(sleepParts(null)).toBeNull()
  })
})
