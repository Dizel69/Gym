import { describe, expect, test } from 'vitest'
import { EXIDX, isBodyweightEq, isCardio } from './exercises.js'
import { backupSlotConfig, cleanBackups, withBackups } from './routine-backups.js'

const BENCH = '0025'
const SQUAT = '0043'
const known = id => !!EXIDX[id]
const bwId = Object.keys(EXIDX).find(id => isBodyweightEq(id) && !isCardio(id))
const cardioId = Object.keys(EXIDX).find(id => isCardio(id))

describe('planned backup on a routine slot', () => {
  test('keeps one other exercise and drops the slot itself', () => {
    expect(cleanBackups([BENCH, BENCH, SQUAT, 3, ''], BENCH, known)).toEqual([SQUAT])
    expect(cleanBackups('nope', BENCH)).toEqual([])
    expect(withBackups([], BENCH)).toEqual({})
    expect(withBackups([SQUAT], BENCH, known)).toEqual({ subs: [SQUAT] })
  })

  test('the backup keeps the slot sets, reps and rest, and the old exercise is the way back', () => {
    const slot = { id: BENCH, sets: 4, reps: 8, weight: 80, restSec: 180, warmupSets: 2, subs: [SQUAT] }
    const before = JSON.parse(JSON.stringify(slot))
    const cfg = backupSlotConfig(slot, SQUAT, { workouts: [] })
    expect(cfg).toMatchObject({ id: SQUAT, sets: 4, reps: 8, weight: 80, restSec: 180, warmupSets: 2, subs: [BENCH] })
    expect(slot).toEqual(before)
  })

  test('a backup already logged opens at its own weight, not the slot weight', () => {
    const S = {
      workouts: [{
        d: '2026-11-01',
        entries: [{ id: SQUAT, target: { sets: 4, reps: 8, weight: 100 }, sets: [{ w: 100, r: 8, done: true }] }],
      }],
    }
    expect(backupSlotConfig({ id: BENCH, sets: 4, reps: 8, weight: 80 }, SQUAT, S).weight).toBe(100)
  })

  test('a bodyweight backup does not inherit a barbell weight', () => {
    const cfg = backupSlotConfig({ id: BENCH, sets: 3, reps: 8, weight: 80 }, bwId, { workouts: [] })
    expect(cfg.weight).toBe(0)
    expect(cfg.bodyweight).toBe(true)
    expect(cfg.subs).toEqual([BENCH])
  })

  test('a lift swapped onto cardio opens as cardio, and an unknown id is refused', () => {
    const cfg = backupSlotConfig({ id: BENCH, sets: 4, reps: 8, weight: 80, restSec: 90 }, cardioId, { workouts: [] })
    expect(cfg.min).toBe(20)
    expect(cfg.reps).toBeUndefined()
    expect(cfg.restSec).toBe(90)
    expect(backupSlotConfig({ id: BENCH }, 'no-such-exercise', { workouts: [] })).toBeNull()
    expect(backupSlotConfig({ id: BENCH }, BENCH, { workouts: [] })).toBeNull()
  })
})
