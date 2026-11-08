import { describe, expect, it } from 'vitest'
import { homeReviewYear, liken, longestWeekRun, monthStats, reviewYears, yearReview } from './year-review.js'

const workout = (d, extra = {}) => ({
  id: d, d, start: extra.start, end: extra.end,
  entries: extra.entries || [{ id: '0025', sets: [{ w: 80, r: 5, done: true }] }],
})

describe('year review', () => {
  it('counts one year, leaves warm-ups out, and picks the exercise with more sets', () => {
    const S = {
      unit: 'kg',
      workouts: [
        workout('2025-12-31', { entries: [{ id: '0032', sets: [{ w: 200, r: 1, done: true }] }] }),
        workout('2026-03-01', {
          start: 0, end: 3600000,
          entries: [
            { id: '0025', n: 'bench', sets: [
              { w: 40, r: 10, done: true, phase: 'warmup' },
              { w: 100, r: 8, done: true },
              { w: 100, r: 6, done: true },
            ] },
            { id: '0027', sets: [{ w: 60, r: 8, done: true }] },
          ],
        }),
        workout('2026-03-08', { start: 0, end: 1800000 }),
      ],
    }
    const year = yearReview(S, 2026)
    expect(year.workouts).toBe(2)
    expect(year.hours).toBe(1.5)
    expect(year.volume).toBe(100 * 8 + 100 * 6 + 60 * 8 + 80 * 5)
    expect(year.favorite.id).toBe('0025')
    expect(year.favorite.sets).toBe(3)
    expect(yearReview(S, 2024)).toBeNull()
    expect(reviewYears(S)).toEqual([2026, 2025])
  })

  it('keeps the longest run of weeks and ignores a session left open all day', () => {
    const workouts = [
      workout('2026-01-05'),
      workout('2026-01-12'),
      workout('2026-01-26'),
      workout('2026-02-02', { start: 0, end: 20 * 3600000 }),
    ]
    expect(longestWeekRun(workouts, 1)).toBe(2)
    expect(yearReview({ unit: 'kg', workouts }, 2026).hours).toBeNull()
    expect(yearReview({ unit: 'kg', workouts }, 2026).streak).toBe(2)
  })

  it('shows the year on the home screen only from 14 December through 31 December', () => {
    expect(homeReviewYear(new Date(2026, 10, 8))).toBeNull()
    expect(homeReviewYear(new Date(2026, 11, 13))).toBeNull()
    expect(homeReviewYear(new Date(2026, 11, 14))).toBe(2026)
    expect(homeReviewYear(new Date(2026, 11, 31))).toBe(2026)
    expect(homeReviewYear(new Date(2027, 0, 1))).toBeNull()
  })

  it('compares the first workout with the last and with the lifter’s own average', () => {
    const S = {
      unit: 'kg',
      bodyweight: [{ w: 80 }],
      workouts: [
        workout('2026-01-02', { entries: [{ id: '0025', sets: [{ w: 50, r: 8, done: true }] }] }),
        workout('2026-06-02', { start: 0, end: 3600000, entries: [{ id: '0025', sets: [{ w: 60, r: 8, done: true }] }] }),
        workout('2026-11-02', { entries: [{ id: '0025', sets: [{ w: 70, r: 5, done: true }] }] }),
      ],
    }
    const year = yearReview(S, 2026)
    expect(year.progress).toMatchObject({ id: '0025', delta: 20, first: { w: 50, r: 8 }, last: { w: 70, r: 5 } })
    expect(year.everyDays).toBe(152)
    expect(year.bodyCopies).toBe(15)
    expect(year.avgVolume).toBe(410)
    expect(year.heaviest).toMatchObject({ d: '2026-06-02', volume: 480 })
    expect(year.busiest.ym).toBe('2026-06')
    expect(monthStats(S, '2026-11').workouts).toBe(1)
    expect(monthStats(S, '2026-11').volume).toBe(350)
    expect(monthStats(S, '2026-10').workouts).toBe(0)
    expect(year.joke).toEqual({ key: 'dog', count: 3, kg: 30 })
  })

  it('likens a lift to dogs or a wardrobe, and a year of iron to cars', () => {
    expect(liken(300)).toEqual({ key: 'dog', count: 10, kg: 30 })
    expect(liken(74)).toEqual({ key: 'wardrobe', count: 1, kg: 70 })
    expect(liken(68100, true)).toEqual({ key: 'car', count: 49, kg: 1400 })
  })

  it('compares a bench with the published Strength Level average', () => {
    const S = { unit: 'kg', body: 'male', workouts: [workout('2026-05-01', { entries: [{ id: '0025', sets: [{ w: 80, r: 1, done: true }] }] })] }
    expect(yearReview(S, 2026).community).toMatchObject({ id: '0025', est: 80, average: 96, delta: -16 })
    const women = yearReview({ ...S, body: 'female' }, 2026)
    expect(women.community.average).toBe(51)
  })

  it('turns a pound log into tonnes', () => {
    const S = { unit: 'lb', workouts: [workout('2026-06-01', { entries: [{ id: '0025', sets: [{ w: 220.462262, r: 10, done: true }] }] })] }
    expect(yearReview(S, 2026).tonnes).toBe(1)
  })
})
