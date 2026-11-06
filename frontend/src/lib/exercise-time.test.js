import { describe, expect, it } from 'vitest'
import { entryTimes, exerciseTimeRows, stampTick } from './exercise-time.js'

const start = Date.parse('2026-11-07T10:00:00')

describe('exercise time', () => {
  it('gives each ticked exercise the time since the previous tick', () => {
    const times = entryTimes({
      start,
      entries: [
        { id: 'bench', sets: [{ done: true, at: start + 8 * 60000 }] },
        { id: 'row', sets: [{ done: true, at: start + 20 * 60000 }] },
      ],
    })
    expect(times[0]).toBe(8 * 60000)
    expect(times[1]).toBe(12 * 60000)
  })

  it('leaves a long break out of the next exercise', () => {
    const times = entryTimes({
      start,
      end: start + 50 * 60000,
      entries: [
        { id: 'bench', sets: [{ done: true, at: start + 5 * 60000 }] },
        { id: 'row', sets: [{ done: true, at: start + 40 * 60000, sec: 30 }] },
      ],
    })
    expect(times[0]).toBe(5 * 60000)
    expect(times[1]).toBe(30 * 1000)
  })

  it('says nothing about a workout whose sets were never timed', () => {
    expect(entryTimes({ start, entries: [{ id: 'bench', sets: [{ done: true }] }] })).toEqual([])
    expect(exerciseTimeRows([{ start, entries: [{ id: 'bench', sets: [{ done: true }] }] }])).toEqual([])
  })

  it('averages an exercise across the sessions in the window', () => {
    const rows = exerciseTimeRows([
      { start, entries: [{ id: 'bench', sets: [{ done: true, at: start + 10 * 60000 }] }] },
      { start: start + 86400000, entries: [{ id: 'bench', sets: [{ done: true, at: start + 86400000 + 20 * 60000 }] }] },
      { start: start - 40 * 86400000, entries: [{ id: 'old', sets: [{ done: true, at: start - 40 * 86400000 + 60000 }] }] },
    ], start)
    expect(rows).toEqual([{ id: 'bench', sessions: 2, total: 30 * 60000, avg: 15 * 60000 }])
  })

  it('stamps a tick once and clears it when the set is undone', () => {
    const set = { done: true }
    stampTick(set, 50)
    expect(set.at).toBe(50)
    stampTick(set, 90)
    expect(set.at).toBe(50)
    set.done = false
    stampTick(set, 100)
    expect(set.at).toBeUndefined()
  })
})
