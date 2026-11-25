import { describe, expect, it } from 'vitest'
import { bestWeightForEntry, workoutVolume, sessionVolume } from './history.js'
import { bodyLoadOf, bodyweightFor } from './bw-load.js'

const pull = { id: 'pu', n: 'pull-up', bp: 'back', eq: 'body weight' }
const push = { id: 'ps', n: 'push-up', bp: 'chest', eq: 'body weight' }
const knees = { id: 'kn', n: 'knee push-up', bp: 'chest', eq: 'body weight' }
const benchDip = { id: 'bd', n: 'bench dip', bp: 'upper arms', eq: 'body weight' }
const crunch = { id: 'cr', n: 'crunch', bp: 'waist', eq: 'body weight' }
const machine = { id: 'ap', n: 'assisted pull-up', bp: 'back', eq: 'leverage machine' }
const band = { id: 'ba', n: 'band assisted pull-up', bp: 'back', eq: 'band' }

const done = (w, r) => ({ w, r, done: true })

describe('body load', () => {
  it('moves the whole body on a pull-up and a share of it on a push-up', () => {
    expect(bodyLoadOf(pull)).toEqual({ share: 1, assisted: false })
    expect(bodyLoadOf(push)).toEqual({ share: 0.64, assisted: false })
    expect(bodyLoadOf(knees)).toEqual({ share: 0.49, assisted: false })
    expect(bodyLoadOf(benchDip)).toBe(null)
    expect(bodyLoadOf(crunch)).toBe(null)
    expect(bodyLoadOf(band)).toBe(null)
  })

  it('treats an assistance machine as weight taken off, not added', () => {
    expect(bodyLoadOf(machine)).toEqual({ share: 1, assisted: true })
  })

  it('adds body weight and a belt, and subtracts assistance', () => {
    const sets = [done(0, 8)]
    expect(workoutVolume({ entries: [{ id: 'pu', sets }] })).toBe(0)
    expect(workoutVolume({ entries: [{ ...pull, sets }] }, { bodyweight: 80 })).toBe(80 * 8)
    expect(workoutVolume({ entries: [{ ...pull, sets: [done(10, 8)] }] }, { bodyweight: 80 })).toBe((80 + 10) * 8)
    expect(workoutVolume({ entries: [{ ...push, sets: [done(0, 10)] }] }, { bodyweight: 80 })).toBe(80 * 0.64 * 10)
    expect(workoutVolume({ entries: [{ ...machine, sets: [done(30, 8)] }] }, { bodyweight: 80 })).toBe((80 - 30) * 8)
    expect(workoutVolume({ entries: [{ ...machine, sets: [done(100, 8)] }] }, { bodyweight: 80 })).toBe(0)
  })

  it('leaves a barbell set, and the record, on the logged load', () => {
    const entry = { id: 'bench', n: 'bench press', bp: 'chest', eq: 'barbell', sets: [done(80, 5)] }
    expect(workoutVolume({ entries: [entry] }, { bodyweight: 80 })).toBe(80 * 5)
    expect(bestWeightForEntry({ id: 'pu', sets: [done(10, 8)] })).toBe(10)
  })

  it('uses the weigh-in on the workout, then the nearest one', () => {
    const S = { bodyweight: [{ d: '2026-11-01', w: 79 }, { d: '2026-11-20', w: 81 }] }
    expect(bodyweightFor({ d: '2026-11-10', start: new Date('2026-11-10T12:00:00').getTime(), bw: 82 }, S)).toBe(82)
    expect(bodyweightFor({ d: '2026-11-10', start: new Date('2026-11-10T12:00:00').getTime() }, S)).toBe(79)
    expect(sessionVolume({
      d: '2026-11-10',
      bw: 80,
      entries: [{ ...pull, sets: [done(0, 8)] }],
    }, S)).toBe(640)
    expect(sessionVolume({
      d: '2026-11-10',
      bw: 80,
      entries: [{ ...pull, sets: [done(0, 8)] }],
    }, { ...S, volumeBodyweight: false })).toBe(0)
  })
})
