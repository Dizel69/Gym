import { describe, expect, it } from 'vitest'
import {
  activeHoliday, adventDays, dayLength, dayLengthChange, daysToNewYear, doorState,
  holidayNearest, holidayOn, seasonUtc, winterSolsticeIso,
} from './holidays.js'

const noon = (y, m, d) => new Date(y, m - 1, d, 12)
const localDay = ({ date }) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)

describe('holiday windows', () => {
  it('keeps New Year from 14 December through 10 January, and the doors only in December', () => {
    expect(holidayOn(noon(2026, 12, 13))).toBeNull()
    expect(holidayOn(noon(2026, 12, 14)).id).toBe('newyear')
    expect(holidayOn(noon(2026, 12, 31)).id).toBe('newyear')
    expect(holidayOn(noon(2027, 1, 10)).id).toBe('newyear')
    expect(holidayOn(noon(2027, 1, 11))).toBeNull()
    expect(adventDays(2026)).toHaveLength(18)
    expect(adventDays(2026)[0]).toBe('2026-12-14')
    expect(adventDays(2026).at(-1)).toBe('2026-12-31')
  })

  it('gives the one-day dates one day, spring three days, and Halloween three', () => {
    expect(holidayOn(noon(2026, 2, 23)).id).toBe('feb23')
    expect(holidayOn(noon(2026, 2, 24))).toBeNull()
    expect(holidayOn(noon(2026, 3, 8)).id).toBe('mar8')
    expect(holidayOn(noon(2026, 5, 1)).id).toBe('spring')
    expect(holidayOn(noon(2026, 5, 3)).id).toBe('spring')
    expect(holidayOn(noon(2026, 5, 4))).toBeNull()
    expect(holidayOn(noon(2026, 5, 9)).id).toBe('may9')
    expect(holidayOn(noon(2026, 6, 12)).id).toBe('jun12')
    expect(holidayOn(noon(2026, 10, 28))).toBeNull()
    expect(holidayOn(noon(2026, 10, 29)).id).toBe('halloween')
    expect(holidayOn(noon(2026, 10, 31)).id).toBe('halloween')
    expect(holidayOn(noon(2026, 11, 1))).toBeNull()
    expect(holidayOn(noon(2026, 11, 4)).id).toBe('unity')
    expect(holidayOn(noon(2026, 11, 5))).toBeNull()
  })

  it('puts the 2026 equinoxes and solstices on the USNO days', () => {
    expect(seasonUtc(2026, 'march')).toMatchObject({ y: 2026, m: 3, d: 20 })
    expect(seasonUtc(2026, 'june')).toMatchObject({ y: 2026, m: 6, d: 21 })
    expect(seasonUtc(2026, 'september')).toMatchObject({ y: 2026, m: 9, d: 23 })
    expect(seasonUtc(2026, 'december')).toMatchObject({ y: 2026, m: 12, d: 21 })
  })

  it('decorates only the local day of an equinox or the June solstice', () => {
    const spring = localDay(seasonUtc(2026, 'march'))
    expect(holidayOn(spring)).toMatchObject({ id: 'equinox', turn: 'spring' })
    expect(holidayOn(localDay(seasonUtc(2026, 'september')))).toMatchObject({ id: 'equinox', turn: 'autumn' })
    expect(holidayOn(localDay(seasonUtc(2026, 'june')))).toMatchObject({ id: 'solstice', turn: 'summer' })
    const next = new Date(spring)
    next.setDate(spring.getDate() + 1)
    expect(holidayOn(next)?.id).not.toBe('equinox')
  })

  it('leaves the December solstice inside New Year and names its local day', () => {
    const iso = winterSolsticeIso(2026)
    expect(['2026-12-21', '2026-12-22']).toContain(iso)
    expect(holidayOn(noon(2026, 12, Number(iso.slice(8)))).id).toBe('newyear')
  })

  it('picks the nearest window for Always, and stays quiet when switched off', () => {
    expect(holidayNearest(noon(2026, 11, 11)).id).toBe('unity')
    expect(holidayNearest(noon(2026, 12, 20)).id).toBe('newyear')
    expect(activeHoliday(noon(2026, 12, 20), 'off')).toBeNull()
    expect(activeHoliday(noon(2026, 7, 1), 'auto')).toBeNull()
    expect(activeHoliday(noon(2026, 7, 1), 'always').id).toBe('solstice')
  })

  it('glows today, waits on a missed door, and keeps the later ones shut', () => {
    const opened = ['2026-12-14']
    expect(doorState('2026-12-14', '2026-12-16', opened)).toBe('open')
    expect(doorState('2026-12-15', '2026-12-16', opened)).toBe('wait')
    expect(doorState('2026-12-16', '2026-12-16', opened)).toBe('today')
    expect(doorState('2026-12-17', '2026-12-16', opened)).toBe('future')
  })

  it('counts the days to New Year', () => {
    expect(daysToNewYear(noon(2026, 12, 31))).toBe(1)
    expect(daysToNewYear(noon(2026, 12, 14))).toBe(18)
    expect(daysToNewYear(noon(2027, 1, 1))).toBe(0)
  })
})

describe('daylight in Moscow', () => {
  it('matches the almanac to a few minutes', () => {
    // timeanddate.com, Moscow 2026: 21 Dec 7:00, 21 Jun 17:33, 20 Mar about 12:10.
    expect(dayLength(noon(2026, 12, 21))).toBeGreaterThan(6 * 60 + 55)
    expect(dayLength(noon(2026, 12, 21))).toBeLessThan(7 * 60 + 5)
    expect(dayLength(noon(2026, 6, 21))).toBeGreaterThan(17 * 60 + 28)
    expect(dayLength(noon(2026, 6, 21))).toBeLessThan(17 * 60 + 38)
    expect(dayLength(noon(2026, 3, 20))).toBeGreaterThan(12 * 60)
    expect(dayLength(noon(2026, 3, 20))).toBeLessThan(12 * 60 + 20)
  })

  it('turns after the solstices and moves fastest at the equinoxes', () => {
    expect(dayLengthChange(noon(2026, 12, 22))).toBeGreaterThan(0)
    expect(dayLengthChange(noon(2026, 12, 18))).toBeLessThan(0)
    expect(dayLengthChange(noon(2026, 6, 22))).toBeLessThan(0)
    expect(dayLengthChange(noon(2026, 3, 20))).toBeGreaterThan(4 * 60)
    expect(dayLengthChange(noon(2026, 9, 23))).toBeLessThan(-4 * 60)
  })
})
