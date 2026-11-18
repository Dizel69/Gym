import { describe, expect, it } from 'vitest'
import { editCompletedSession, saveWorkoutEdit, editLeftEmpty, deleteEditedWorkout, editChangesNothing } from './session-edit.js'
import { nextPrescription } from './progression.js'

const bench = (w, r = 5) => ({ id: '0025', sets: [{ w, r, done: true }] })
const workout = (over = {}) => ({
  id: 'workout', d: '2026-09-01', start: 10, end: 20, name: 'Push', prs: ['0025'],
  entries: [bench(40)],
  ...over,
})
const state = (over = {}) => ({
  unit: 'kg', workouts: [workout()], exWeights: { '0025': { w: 40, d: '2026-09-01' } }, active: null, ...over,
})

describe('editing a finished workout', () => {
  it('leaves history alone until the edit is saved', () => {
    const s = state()
    editCompletedSession(s, s.workouts[0])
    s.active.entries[0].sets[0].w = 80
    expect(s.workouts[0].entries[0].sets[0].w).toBe(40)
    expect(s.active.editingWorkoutId).toBe('workout')
  })

  it('refuses to open while a live session is going', () => {
    const s = state({ active: { id: 'live' } })
    expect(() => editCompletedSession(s, s.workouts[0])).toThrow(/current workout/)
  })

  it('saves the corrected weight and the next session reads it', () => {
    const s = state({
      workouts: [workout({
        entries: [{ id: '0025', target: { sets: 3, reps: 5, weight: 100 }, sets: [5, 5, 5].map(r => ({ w: 100, r, done: true })) }],
      })],
      exWeights: { '0025': { w: 100, d: '2026-09-01' } },
    })
    editCompletedSession(s, s.workouts[0])
    for (const set of s.active.entries[0].sets) set.w = 80
    const saved = saveWorkoutEdit(s, 50)
    expect(saved.entries[0].sets[0].w).toBe(80)
    expect(saved.vol).toBe(80 * 5 * 3)
    expect(saved._ts).toBe(50)
    expect(s.active).toBe(null)
    expect(s.exWeights['0025'].w).toBe(80)
    const next = nextPrescription(s, { id: '0025', sets: 3, reps: 5, weight: 100, prog: 'greyskull' })
    expect(next.weight).toBe(82.5)
  })

  it('moves a remembered best down to a later session and does not hand that session a badge', () => {
    const later = workout({ id: 'later', d: '2026-09-03', start: 30, prs: [], entries: [bench(30)] })
    const s = state({ workouts: [workout(), later], exWeights: { '0025': { w: 40, d: '2026-09-01' } } })
    editCompletedSession(s, s.workouts[0])
    s.active.entries[0].sets[0].w = 20
    saveWorkoutEdit(s)
    expect(s.exWeights['0025']).toEqual({ w: 30, d: '2026-09-03' })
    expect(s.workouts.find(w => w.id === 'later').prs).toEqual([])
    expect(s.workouts.find(w => w.id === 'workout').prs).toContain('0025')
  })

  it('does not touch a best that was confirmed in another session', () => {
    const s = state({ exWeights: { '0025': { w: 55, d: '2026-08-01' } } })
    editCompletedSession(s, s.workouts[0])
    s.active.entries[0].sets[0].w = 60
    saveWorkoutEdit(s)
    expect(s.exWeights['0025']).toEqual({ w: 55, d: '2026-08-01' })
  })

  it('treats less help as the record on an assistance machine', () => {
    const dip = { id: '0017', sets: [{ w: 40, r: 5, done: true }] }
    const s = state({
      workouts: [workout({ entries: [dip], prs: ['0017'] })],
      exWeights: { '0017': { w: 40, d: '2026-09-01' } },
    })
    editCompletedSession(s, s.workouts[0])
    s.active.entries[0].sets[0].w = 20
    saveWorkoutEdit(s)
    expect(s.exWeights['0017'].w).toBe(20)
    expect(s.workouts[0].prs).toContain('0017')
  })

  it('closing an untouched workout is not a change', () => {
    const s = state()
    editCompletedSession(s, s.workouts[0])
    expect(editChangesNothing(s)).toBe(true)
    const saved = saveWorkoutEdit(s, 99)
    expect(saved._ts).toBeUndefined()
    expect(s.workouts[0].entries[0].sets[0].w).toBe(40)
  })

  it('an edit with nothing logged is empty and deleting it drops the remembered best', () => {
    const s = state()
    editCompletedSession(s, s.workouts[0])
    s.active.entries[0].sets[0].done = false
    expect(editLeftEmpty(s.active)).toBe(true)
    expect(editChangesNothing(s)).toBe(false)
    expect(deleteEditedWorkout(s)).toBe(true)
    expect(s.workouts).toEqual([])
    expect(s.exWeights['0025']).toBeUndefined()
    expect(s.active).toBe(null)
  })
})
