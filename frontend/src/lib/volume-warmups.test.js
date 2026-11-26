import { describe, expect, test } from 'vitest'
import { bestWeightForEntry, countsWarmups, sessionVolume, workoutVolume } from './history.js'

const warm = { w: 50, r: 5, done: true, phase: 'warmup', warmup: true }
const work = { w: 100, r: 5, done: true }
const session = { entries: [{ id: '0025', sets: [warm, work, work] }] }

describe('warm-ups in volume', () => {
  test('the switch is off until it is turned on', () => {
    expect(countsWarmups({})).toBe(false)
    expect(countsWarmups({ volumeWarmups: false })).toBe(false)
    expect(countsWarmups({ volumeWarmups: true })).toBe(true)
  })

  test('a screen counts done warm-ups only when asked, and the record stays on the work set', () => {
    expect(workoutVolume(session)).toBe(1000)
    expect(workoutVolume(session, { warmups: true })).toBe(1250)
    expect(sessionVolume(session, {})).toBe(1000)
    expect(sessionVolume(session, { volumeWarmups: true })).toBe(1250)
    expect(bestWeightForEntry(session.entries[0])).toBe(100)
  })

  test('a warm-up that was not ticked still adds nothing', () => {
    const open = { entries: [{ id: '0025', sets: [{ ...warm, done: false }, work] }] }
    expect(workoutVolume(open, { warmups: true })).toBe(500)
  })
})
