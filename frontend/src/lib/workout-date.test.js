import { describe, expect, it } from 'vitest'
import { moveWorkout, setWorkoutDuration, durationMinOf, endsInFuture, rebuildPrHistory } from './workout-date.js'

const start = Date.parse('2026-09-01T18:00:00')
const workout = (over = {}) => ({
  id: 'workout', d: '2026-09-01', start, end: start + 60 * 60000, name: 'Push', prs: ['0025'],
  entries: [{ id: '0025', sets: [{ w: 100, r: 5, done: true }] }],
  ...over,
})

describe('date and duration of a saved workout', () => {
  it('moves the session and keeps its length', () => {
    const moved = moveWorkout([workout()], { id: 'workout' }, '2026-09-03', '19:30', 7)
    expect(moved).toHaveLength(1)
    expect(moved[0].d).toBe('2026-09-03')
    expect(durationMinOf(moved[0])).toBe(60)
    expect(moved[0]._ts).toBe(7)
    expect(moved[0].entries[0].sets[0].w).toBe(100)
  })

  it('files the moved session in date order and drops a badge the new order breaks', () => {
    const light = workout({ id: 'light', prs: ['0025'], entries: [{ id: '0025', sets: [{ w: 80, r: 5, done: true }] }] })
    const heavy = workout({
      id: 'heavy', d: '2026-09-03', start: start + 2 * 86400000, end: start + 2 * 86400000 + 60 * 60000, prs: ['0025'],
      entries: [{ id: '0025', sets: [{ w: 100, r: 5, done: true }] }],
    })
    const filed = moveWorkout([light, heavy], light, '2026-09-04', '18:00')
    expect(filed.map(w => w.id)).toEqual(['heavy', 'light'])
    expect(filed.find(w => w.id === 'heavy').prs).toContain('0025')
    expect(filed.find(w => w.id === 'light').prs).not.toContain('0025')
  })

  it('does not award a badge to a session that was not moved', () => {
    const light = workout({ id: 'light', d: '2026-09-01', prs: [], entries: [{ id: '0025', sets: [{ w: 60, r: 5, done: true }] }] })
    const heavy = workout({ id: 'heavy', d: '2026-09-03', start: start + 2 * 86400000, prs: ['0025'] })
    const filed = moveWorkout([light, heavy], heavy, '2026-09-02', '18:00')
    expect(filed.find(w => w.id === 'light').prs).toEqual([])
  })

  it('changes how long it ran without moving the day', () => {
    const next = setWorkoutDuration([workout()], { id: 'workout' }, 45, 9)
    expect(durationMinOf(next[0])).toBe(45)
    expect(next[0].d).toBe('2026-09-01')
    expect(next[0]._ts).toBe(9)
    expect(setWorkoutDuration(next, { id: 'workout' }, 45)).toBe(null)
  })

  it('rejects an end that has not happened yet', () => {
    const now = Date.parse('2026-09-01T18:30:00')
    expect(endsInFuture('2026-09-01', '18:00', 60, now)).toBe(true)
    expect(endsInFuture('2026-09-01', '18:00', 20, now)).toBe(false)
  })

  it('rebuilds badges only for the exercises that were touched', () => {
    const other = { id: 'row', sets: [{ w: 50, r: 8, done: true }] }
    const list = [
      { id: 'a', d: '2026-09-01', start: 1, prs: ['0099'], entries: [{ id: '0025', sets: [{ w: 40, r: 5, done: true }] }, other] },
      { id: 'b', d: '2026-09-02', start: 2, prs: ['0025'], entries: [{ id: '0025', sets: [{ w: 30, r: 5, done: true }] }] },
    ]
    const out = rebuildPrHistory(list, ['0025'], list[1])
    expect(out[0].prs).toContain('0099')
    expect(out[1].prs).not.toContain('0025')
  })
})
