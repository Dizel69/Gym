import { describe, expect, it } from 'vitest'
import { levelAt, levelWeights, liftOf, strengthLevel, strengthLevels } from './strength-level.js'

const profile = (over = {}) => ({
  unit: 'kg',
  body: 'male',
  bodyweight: [{ d: '2026-11-01', w: 80 }],
  workouts: [{
    id: 'w1', d: '2026-11-01', start: 1,
    entries: [{ id: '0025', sets: [{ w: 80, r: 1, done: true }] }],
  }],
  ...over,
})

describe('strength level', () => {
  it('grades a bodyweight bench as intermediate for a man and advanced for a woman', () => {
    const man = strengthLevel(profile(), '0025')
    expect(man.name).toBe('intermediate')
    expect(man.ratio).toBe(1)
    expect(man.next).toMatchObject({ name: 'advanced', weight: 120 })
    expect(man.next.weight - man.e1rm).toBe(40)

    const woman = strengthLevel(profile({ body: 'female' }), '0025')
    expect(woman.name).toBe('advanced')
    expect(woman.next).toMatchObject({ name: 'elite', weight: 120 })
  })

  it('stays quiet without a weigh-in, a real estimate, or a standard', () => {
    expect(strengthLevel(profile({ bodyweight: [] }), '0025')).toBeNull()
    expect(strengthLevel(profile({
      workouts: [{ id: 'w', d: '2026-11-01', start: 1, entries: [{ id: '0025', sets: [{ w: 80, r: 8, done: true, warmup: true }] }] }],
    }), '0025')).toBeNull()
    expect(liftOf('0001')).toBeNull()
    expect(strengthLevel(profile(), '0001')).toBeNull()
  })

  it('does not call a lift a beginner until it clears the first line', () => {
    const light = strengthLevel(profile({
      workouts: [{ id: 'w', d: '2026-11-01', start: 1, entries: [{ id: '0025', sets: [{ w: 30, r: 1, done: true }] }] }],
    }), '0025')
    expect(light.name).toBe('below')
    expect(light.level).toBe(-1)
    expect(light.next).toMatchObject({ name: 'beginner', weight: 40 })
  })

  it('grades a rear-view full squat as the same squat', () => {
    expect(liftOf('1461')).toBe('squat')
    expect(liftOf('1462')).toBe('squat')
    expect(liftOf('0878')).toBe('squat')
    expect(liftOf('6813')).toBe('bench')
    expect(liftOf('0967')).toBe('deadlift')
    const S = profile({
      workouts: [{
        id: 'w', d: '2026-11-09', start: 1,
        entries: [{ id: '1461', sets: [{ w: 100, r: 7, done: true }] }],
      }],
    })
    const squat = strengthLevels(S).find(r => r.lift === 'squat')
    expect(squat.id).toBe('1461')
    expect(squat.e1rm).toBeGreaterThan(100)
  })

  it('grades the incline dumbbell press, the seated press and the alternating curl', () => {
    expect(liftOf('0314')).toBe('dbBench')
    expect(liftOf('3545')).toBe('dbBench')
    expect(liftOf('0290')).toBe('dbPress')
    expect(liftOf('0426')).toBe('dbPress')
    expect(liftOf('0285')).toBe('dbCurl')
    expect(liftOf('0416')).toBe('dbCurl')
    const S = profile({
      workouts: [{
        id: 'w', d: '2026-11-09', start: 1,
        entries: [
          { id: '0314', sets: [{ w: 20, r: 8, done: true }] },
          { id: '0290', sets: [{ w: 15, r: 12, done: true }] },
          { id: '0285', sets: [{ w: 12.5, r: 8, done: true }] },
        ],
      }],
    })
    const rows = strengthLevels(S)
    expect(rows.find(r => r.lift === 'dbBench')).toMatchObject({ id: '0314', perBell: true })
    expect(rows.find(r => r.lift === 'dbPress')).toMatchObject({ id: '0290', perBell: true })
    expect(rows.find(r => r.lift === 'dbCurl')).toMatchObject({ id: '0285', perBell: true })
  })

  it('grades an alternating curl from the reps on one arm', () => {
    const S = profile({
      workouts: [{
        id: 'w', d: '2026-11-09', start: 1,
        entries: [{
          id: '0285',
          sets: [{
            w: 12.5, r: 24, done: true,
            sides: { L: { w: 12.5, r: 12, done: true }, R: { w: 12.5, r: 12, done: true } },
          }],
        }],
      }],
    })
    const curl = strengthLevels(S).find(r => r.lift === 'dbCurl')
    expect(curl.e1rm).toBe(17.5)
    expect(curl.name).toBe('novice')
  })

  it('keeps the stronger of two squat names and reads a dumbbell per bell', () => {
    const S = profile({
      workouts: [{
        id: 'w', d: '2026-11-01', start: 1,
        entries: [
          { id: '0043', sets: [{ w: 100, r: 1, done: true }] },
          { id: '3593', sets: [{ w: 140, r: 1, done: true }] },
          { id: '0294', sets: [{ w: 16, r: 1, done: true }] },
        ],
      }],
    })
    const rows = strengthLevels(S)
    const squat = rows.find(r => r.lift === 'squat')
    expect(squat.id).toBe('3593')
    expect(squat.ratio).toBe(1.75)
    expect(squat.name).toBe('intermediate')
    const curl = rows.find(r => r.lift === 'dbCurl')
    expect(curl.perBell).toBe(true)
    expect(curl.ratio).toBe(0.2)
    expect(curl.name).toBe('novice')
  })

  it('lists the one-rep max that opens every level at this body weight', () => {
    const lv = strengthLevel(profile(), '0025')
    const steps = levelWeights(lv)
    expect(steps.map(s => s.weight)).toEqual([40, 60, 80, 120, 160])
    expect(steps.map(s => s.reached)).toEqual([true, true, true, false, false])
    expect(steps[2].name).toBe('intermediate')
  })

  it('uses the latest weigh-in and stops at elite', () => {
    const S = profile({
      bodyweight: [{ d: '2026-10-01', w: 70 }, { d: '2026-11-01', w: 80 }],
      workouts: [{ id: 'w', d: '2026-11-01', start: 1, entries: [{ id: '0025', sets: [{ w: 160, r: 1, done: true }] }] }],
    })
    const lv = strengthLevel(S, '0025')
    expect(lv.bw).toBe(80)
    expect(lv.name).toBe('elite')
    expect(lv.next).toBeNull()
    expect(levelAt(2, [0.5, 0.75, 1, 1.5, 2])).toBe(4)
  })
})
