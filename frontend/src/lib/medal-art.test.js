import { describe, expect, it } from 'vitest'
import { medalMonths, monthMedal, MONTH_ICONS } from './medal-art.js'

describe('monthMedal', () => {
  it('gives every month from 2026 through 2030 its own picture', () => {
    const months = medalMonths()
    expect(months).toHaveLength(60)
    expect(months[0]).toBe('2026-01')
    expect(months.at(-1)).toBe('2030-12')
    const pictures = months.map(ym => {
      const art = monthMedal(ym)
      return art.icon + '/' + art.frame
    })
    expect(new Set(pictures).size).toBe(60)
    expect(new Set(months.map(ym => monthMedal(ym).icon)).size).toBe(60)
    expect(monthMedal('2026-11').icon).not.toBe(monthMedal('2027-11').icon)
    expect(monthMedal('2026-11').frame).not.toBe(monthMedal('2027-11').frame)
  })

  it('does not hand an outside month one of the sixty pictures unchanged', () => {
    const owned = new Set(medalMonths().map(ym => {
      const art = monthMedal(ym)
      return art.icon + '/' + art.frame + '/' + art.metal
    }))
    for (const ym of ['2025-11', '2031-01']) {
      const art = monthMedal(ym)
      expect(MONTH_ICONS).toContain(art.icon)
      expect(owned.has(art.icon + '/' + art.frame + '/' + art.metal)).toBe(false)
    }
  })
})