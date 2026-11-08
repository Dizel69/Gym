import { describe, expect, it } from 'vitest'
import { homeReviewYear, longestWeekRun, reviewYears, yearReview } from './year-review.js'

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

  it('shows the ending year in December and the year just gone in January', () => {
    expect(homeReviewYear(new Date(2026, 10, 8))).toBeNull()
    expect(homeReviewYear(new Date(2026, 11, 1))).toBe(2026)
    expect(homeReviewYear(new Date(2027, 0, 15))).toBe(2026)
    expect(homeReviewYear(new Date(2027, 1, 1))).toBeNull()
  })

  it('turns a pound log into tonnes', () => {
    const S = { unit: 'lb', workouts: [workout('2026-06-01', { entries: [{ id: '0025', sets: [{ w: 220.462262, r: 10, done: true }] }] })] }
    expect(yearReview(S, 2026).tonnes).toBe(1)
  })
})
