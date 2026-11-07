import { describe, expect, it } from 'vitest'
import { workoutCardModel } from './workout-card.js'

const workout = {
  name: 'жим',
  d: '2026-11-08',
  start: 0,
  end: 45 * 60000,
  vol: 2400,
  prs: ['0025'],
  entries: [
    { id: '0025', sets: [
      { w: 40, r: 8, done: true, phase: 'warmup' },
      { w: 80, r: 8, done: true },
      { w: 80, r: 6, done: true },
      { w: 80, r: 8, done: false },
    ] },
    { id: '0032', sets: [{ w: 20, r: 10, done: true, phase: 'warmup' }] },
  ],
}

describe('workout card', () => {
  it('names the session and the working weights, and leaves the warm-up and the unchecked set off', () => {
    const card = workoutCardModel(workout, 'kg')
    expect(card.title).toBe('Жим')
    expect(card.meta).toContain('45 min')
    expect(card.meta).toContain('2,400 kg')
    expect(card.rows).toHaveLength(2)
    expect(card.rows[0].pr).toBe(true)
    expect(card.rows[0].sets).toBe('80×8 · 80×6')
    expect(card.rows[0].sets).not.toContain('40×')
    expect(card.rows[1].sets).toBe('20×10')
    expect(card.rows[1].pr).toBe(false)
  })

  it('keeps a warm-up when that is all the exercise has', () => {
    const card = workoutCardModel({ name: 'pull', entries: workout.entries.slice(1) }, 'kg')
    expect(card.rows[0].sets).toBe('20×10')
  })
})