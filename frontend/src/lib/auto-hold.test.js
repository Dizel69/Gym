import { describe, expect, it } from 'vitest'
import { nextAutoHold } from './auto-hold.js'

const hold = (sec, done = false) => ({ sec, done })
const reps = done => ({ w: 80, r: 8, done })
const active = entries => ({ entries })

describe('next hold after a rest', () => {
  const timed = idx => idx === 0 || idx === 2

  it('takes the next undone hold of the same exercise', () => {
    const A = active([{ sets: [hold(45, true), hold(45)] }])
    expect(nextAutoHold(A, 0, () => true)).toEqual({ idx: 0, i: 1, sec: 45 })
  })

  it('walks on to the next exercise once this one is done', () => {
    const A = active([{ sets: [hold(30, true)] }, { sets: [hold(20)] }])
    expect(nextAutoHold(A, 0, () => true)).toEqual({ idx: 1, i: 0, sec: 20 })
  })

  it('stops at a reps set that is still to do', () => {
    const A = active([{ sets: [reps(true)] }, { sets: [reps(false)] }, { sets: [hold(45)] }])
    expect(nextAutoHold(A, 0, timed)).toBe(null)
  })

  it('does not start a hold while a saved workout is being corrected', () => {
    const A = active([{ sets: [hold(45)] }])
    A.editingWorkoutId = 'workout'
    expect(nextAutoHold(A, 0, () => true)).toBe(null)
  })

  it('starts a hold that follows a finished reps exercise', () => {
    const A = active([{ sets: [reps(true)] }, { sets: [hold(15)] }])
    expect(nextAutoHold(A, 0, idx => idx === 1)).toEqual({ idx: 1, i: 0, sec: 15 })
  })

  it('leaves a per-side hold and a finished workout alone', () => {
    const side = { sec: 45, done: false, sides: { L: { sec: 45 }, R: { sec: 45 } } }
    expect(nextAutoHold(active([{ sets: [side] }]), 0, () => true)).toBe(null)
    expect(nextAutoHold(active([{ sets: [hold(45, true)] }]), 0, () => true)).toBe(null)
    expect(nextAutoHold({ entries: [], backfill: true }, 0, () => true)).toBe(null)
  })
})
