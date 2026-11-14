import { describe, it, expect } from 'vitest'
import { EXIDX, EXDB, smOf } from './exercises.js'
import {
  MUSCLES, MUSCLE_NAME, CHEST_HEADS, exerciseMuscleSnapshot, hasExplicitMuscleMetadata, levelsOf, loadOf,
  loadOfWeekPlan, loadOfWorkouts, matchesMuscleGroups, muscleBalanceWindow, muscleGroupsOf, musclesOf, rankOf,
} from './muscles.js'

const flatChest = { 'upper-chest': 1, 'mid-chest': 1, 'lower-chest': 1 }

describe('multi-muscle exercise metadata', () => {
  it('normalizes legacy primary/secondary fields and removes duplicate groups', () => {
    const ex = { tg: 'pectorals', mg: 'triceps', sm: ['triceps', 'chest'] }
    expect(muscleGroupsOf(ex)).toEqual([...CHEST_HEADS, 'triceps'])
    expect(musclesOf(ex)).toEqual({ ...flatChest, triceps: 0.4 })
  })

  it('uses explicit multi-group metadata when present and supports legacy single groups', () => {
    expect(muscleGroupsOf({ muscleGroups: ['chest', 'pectorals', 'triceps'] })).toEqual([...CHEST_HEADS, 'triceps'])
    expect(muscleGroupsOf({ tg: 'chest' })).toEqual([...CHEST_HEADS])
    expect(MUSCLE_NAME.chest).toBe('Chest')
  })

  it('falls back to the legacy body-part map when an optional multi-group field is empty', () => {
    expect(muscleGroupsOf({ bp: 'back', muscleGroups: [] })).toEqual(['upper-back', 'lower-back'])
    expect(matchesMuscleGroups({ bp: 'back', muscleGroups: [] }, ['lower-back'])).toBe(true)
  })

  it('falls back consistently when explicit groups contain only unknown names', () => {
    const ex = { bp: 'back', muscleGroups: ['not-a-drawable-name'] }
    expect(muscleGroupsOf(ex)).toEqual(['upper-back', 'lower-back'])
    expect(musclesOf(ex)).toEqual({ 'upper-back': 0.75, 'lower-back': 0.25 })
  })

  it('matches an exercise when any requested muscle group matches', () => {
    const ex = { muscleGroups: ['chest', 'triceps'] }
    expect(matchesMuscleGroups(ex, ['hamstring', 'triceps'])).toBe(true)
    expect(matchesMuscleGroups(ex, ['hamstring', 'gluteal'])).toBe(false)
    expect(matchesMuscleGroups(ex, [])).toBe(true)
  })

  it('counts one effective set per unique group instead of double counting duplicates', () => {
    expect(loadOf([{ id: 'inline', ex: { tg: 'chest', sm: ['chest', 'triceps'] }, sets: 2 }]))
      .toEqual({ 'upper-chest': 2, 'mid-chest': 2, 'lower-chest': 2, triceps: 0.8 })
  })

  it('uses multi-muscle metadata carried by a history entry when its catalogue id is unavailable', () => {
    expect(loadOfWorkouts([{ entries: [{
      id: 'deleted-custom', muscleGroups: ['chest', 'chest', 'triceps'],
      sets: [{ done: true }],
    }] }])).toEqual({ 'upper-chest': 1, 'mid-chest': 1, 'lower-chest': 1, triceps: 1 })
  })
})

describe('locomotion', () => {
  it('counts a brisk walk as leg work and leaves other cardio alone', () => {
    expect(musclesOf({ n: 'walking', bp: 'cardio', tg: 'cardiovascular system' })).toMatchObject({
      quadriceps: 1, gluteal: 1, hamstring: 0.6, calves: 0.8,
    })
    expect(musclesOf({ n: 'battle rope', bp: 'cardio', tg: 'cardiovascular system' }).quadriceps).toBeUndefined()
    expect(musclesOf({ n: "farmer's walk", bp: 'upper legs', tg: 'quads' }).hamstring).toBeUndefined()
  })
})

describe('deltoid heads', () => {
  it('splits a generic shoulder into front, side and rear from the exercise name', () => {
    expect(musclesOf({ n: 'dumbbell lateral raise', bp: 'shoulders', tg: 'delts' })).toEqual({ 'side-deltoid': 1 })
    expect(musclesOf({ n: 'dumbbell front raise', bp: 'shoulders', tg: 'delts' })).toEqual({ 'front-deltoid': 1 })
    expect(musclesOf({ n: 'dumbbell reverse fly', bp: 'shoulders', tg: 'delts' })).toEqual({ 'rear-deltoid': 1 })
    expect(musclesOf({ n: 'dumbbell shoulder press', bp: 'shoulders', tg: 'delts' })).toEqual({
      'front-deltoid': 1, 'side-deltoid': 1, 'upper-chest': 0.4,
    })
    expect(musclesOf({ n: 'barbell bench press', bp: 'chest', tg: 'pectorals', sm: ['deltoids'] })['front-deltoid']).toBe(0.4)
    expect(musclesOf({ n: 'barbell bench press', bp: 'chest', tg: 'pectorals', sm: ['deltoids'] })['side-deltoid']).toBeUndefined()
  })
})

describe('chest departments', () => {
  it('lights every chest head equally on a flat barbell bench press', () => {
    const m = musclesOf(EXIDX['0025'])
    expect(m['upper-chest']).toBe(1)
    expect(m['mid-chest']).toBe(1)
    expect(m['lower-chest']).toBe(1)
  })

  it('emphasizes the upper chest more than the lower on incline press', () => {
    const m = musclesOf(EXIDX['0047'])
    expect(m['upper-chest']).toBeGreaterThan(m['lower-chest'])
    expect(m['mid-chest']).toBeGreaterThan(m['lower-chest'])
  })

  it('emphasizes the lower chest more than the upper on decline press and chest dip', () => {
    const decline = musclesOf(EXIDX['0033'])
    const dip = musclesOf(EXIDX['0251'])
    expect(decline['lower-chest']).toBeGreaterThan(decline['upper-chest'])
    expect(dip['lower-chest']).toBeGreaterThan(dip['upper-chest'])
  })

  it('inverts push-up emphasis versus bench incline/decline', () => {
    const declinePu = musclesOf(EXIDX['0279'])
    const inclinePu = musclesOf(EXIDX['0493'])
    expect(declinePu['upper-chest']).toBeGreaterThan(declinePu['lower-chest'])
    expect(inclinePu['lower-chest']).toBeGreaterThan(inclinePu['upper-chest'])
  })

  it('loads only the upper chest on seated dumbbell shoulder press', () => {
    const m = musclesOf(EXIDX['0405'])
    expect(m['upper-chest']).toBeGreaterThan(0)
    expect(m['mid-chest']).toBeUndefined()
    expect(m['lower-chest']).toBeUndefined()
  })

  it('spreads a legacy chest snapshot across all three heads', () => {
    expect(musclesOf({ muscleWeights: { chest: 1 } })).toEqual(flatChest)
  })

  it('keeps muscle group order head-to-toe', () => {
    expect(muscleGroupsOf(EXIDX['0025'])).toEqual([
      ...CHEST_HEADS, 'triceps', 'front-deltoid', 'biceps', 'serratus',
    ])
  })
})

describe('catalogue secondary muscles', () => {
  it('maps a bench press to chest, triceps and deltoids', () => {
    expect(musclesOf(EXIDX['0025'])).toMatchObject({
      ...flatChest,
      triceps: 0.4,
      'front-deltoid': 0.4,
      serratus: 0.4,
    })
  })

  it('shades serratus on chest and shoulder presses, not on leg or french presses', () => {
    expect(musclesOf(EXIDX['0314']).serratus).toBe(0.4) // dumbbell incline bench press
    expect(musclesOf(EXIDX['0577']).serratus).toBe(0.4) // lever chest press
    expect(musclesOf(EXIDX['0405']).serratus).toBe(0.4) // dumbbell seated shoulder press
    expect(musclesOf(EXIDX['0043']).serratus).toBeUndefined()
    expect(musclesOf({ n: 'sled 45° leg press', bp: 'upper legs', tg: 'quads' }).serratus).toBeUndefined()
    expect(musclesOf({ n: 'ez bar standing french press', bp: 'upper arms', tg: 'triceps' }).serratus).toBeUndefined()
    expect(musclesOf(EXIDX['0027']).serratus).toBeUndefined() // barbell bent over row
  })

  it('maps a squat to glutes, quads and hamstrings', () => {
    expect(musclesOf(EXIDX['0043'])).toMatchObject({
      gluteal: 1,
      quadriceps: 1,
      hamstring: 0.4,
    })
  })

  it('counts the shin with the calves', () => {
    expect(musclesOf(EXIDX['1379'])).toEqual({ calves: 1, hamstring: 0.4 })
    expect(musclesOf(EXIDX['1396'])).toEqual({ calves: 1 })
    expect(musclesOf({ bp: 'lower legs' })).toEqual({ calves: 1 })
    expect(musclesOf({ muscleWeights: { calves: 1, tibialis: 0.4 } })).toEqual({ calves: 1 })
    expect(musclesOf({ muscleWeights: { tibialis: 0.4 } })).toEqual({ calves: 0.4 })
    expect(musclesOf(EXIDX['1379']).tibialis).toBeUndefined()
  })

  it('maps common row variations to the upper back, biceps and rear deltoids', () => {
    for (const id of ['0027', '0293', '0499', '0861']) {
      expect(musclesOf(EXIDX[id])).toMatchObject({
        'upper-back': 1,
        biceps: 0.4,
        'front-deltoid': 0.4,
      })
    }
  })
})


describe('catalogue secondary additions', () => {
  it('enriches the muscle map without mutating the raw dataset', () => {
    const raw = EXDB.find(e => e.id === '0027')
    expect(raw.sm).not.toContain('rear deltoids')
    expect(smOf(raw)).toContain('rear deltoids')
    expect(musclesOf(raw)).toHaveProperty('rear-deltoid')
    expect(musclesOf(raw)).not.toHaveProperty('front-deltoid')
  })
})


describe('explicit multi-primary metadata', () => {
  it('gives every primary full weight and secondaries supporting weight', () => {
    const ex = {
      bp: 'chest', tg: 'abs', mg: 'triceps', sm: ['lower back'],
      primaries: ['chest', 'triceps', 'chest'], secondaries: ['deltoids', 'triceps'],
    }
    expect(muscleGroupsOf(ex)).toEqual([...CHEST_HEADS, 'triceps', 'front-deltoid'])
    expect(musclesOf(ex)).toEqual({ ...flatChest, triceps: 1, 'front-deltoid': 0.4 })
  })

  it('keeps the body-part fallback when primaries are absent or explicitly empty', () => {
    const expected = { 'upper-back': 0.75, 'lower-back': 0.25 }
    expect(musclesOf({ bp: 'back' })).toEqual(expected)
    expect(musclesOf({ bp: 'back', primaries: [] })).toEqual(expected)
  })

  it('keeps legacy metadata when a new array field is present but empty', () => {
    expect(exerciseMuscleSnapshot({ bp: 'chest', tg: 'abs', primaries: [] })).toMatchObject({
      muscleGroups: ['abs'],
    })
  })

  it('provides a conservative Full body fallback for legacy custom exercises', () => {
    expect(muscleGroupsOf({ bp: 'full body' })).toEqual([
      ...CHEST_HEADS, 'upper-back', 'gluteal', 'quadriceps', 'hamstring', 'abs',
    ])
    expect(musclesOf({ bp: 'full body' })).toEqual({
      'upper-chest': 0.2, 'mid-chest': 0.2, 'lower-chest': 0.2,
      'upper-back': 0.2, gluteal: 0.2, quadriceps: 0.2, hamstring: 0.1, abs: 0.1,
    })
  })

  it('preserves explicit primary and secondary arrays in history snapshots', () => {
    expect(exerciseMuscleSnapshot({
      n: 'Deadlift', bp: 'full body', primaries: ['gluteal', 'lower-back'], secondaries: ['hamstring'],
    })).toMatchObject({
      n: 'Deadlift', bp: 'full body', primaries: ['gluteal', 'lower-back'], secondaries: ['hamstring'],
      muscleGroups: ['gluteal', 'lower-back', 'hamstring'],
    })
  })
})


describe('map load with warm-up phases', () => {
  it('excludes warm-up sets from the by-sets-worked map', () => {
    const w = {
      id: 'w1', d: '2026-08-01', start: Date.UTC(2026, 7, 1, 10), unit: 'kg',
      entries: [{
        id: '0025',
        sets: [
          { done: true, phase: 'warmup', w: 20, r: 8 },
          { done: true, phase: 'work', w: 60, r: 8 },
        ],
      }],
    }
    const load = loadOfWorkouts([w], null)
    expect(load['mid-chest']).toBe(1)
  })
})

describe('deleted custom exercises', () => {
  const snapshotEntry = {
    id: 'gone-custom-1',
    sets: [{ w: 60, r: 8, done: true }],
    muscleSnapshot: { n: 'Deleted custom', bp: 'chest', muscleGroups: ['chest'], muscleWeights: { chest: 1 } },
  }

  it('reads muscle load back out of the snapshot', () => {
    expect(loadOfWorkouts([{ d: '2026-08-01', entries: [snapshotEntry] }])).toEqual(flatChest)
  })

  it('reports the snapshot groups as explicit metadata', () => {
    expect(hasExplicitMuscleMetadata(snapshotEntry)).toBe(true)
    expect(muscleGroupsOf(snapshotEntry)).toEqual([...CHEST_HEADS])
  })

  it('still prefers the entry\'s own metadata when it has any', () => {
    const withOwn = { ...snapshotEntry, tg: 'quadriceps' }
    expect(muscleGroupsOf(withOwn)).toEqual(['quadriceps'])
  })
})

describe('warm-up boundary', () => {
  it('excludes every phase spelling the workout model treats as a warm-up', () => {
    const entries = spelling => [{ id: '0025', sets: [{ w: 100, r: 5, done: true, phase: spelling }] }]
    for (const spelling of ['warmup', 'warm-up', 'warm_up', 'Warmup', ' warmup ']) {
      expect(loadOfWorkouts([{ d: '2026-08-01', entries: entries(spelling) }]), spelling).toEqual({})
    }
  })
})

describe('muscle balance windows and ranking', () => {
  const now = new Date('2026-08-27T12:00:00').getTime()
  const workouts = [
    { id: 'monday', d: '2026-08-24', start: new Date('2026-08-24T12:00:00').getTime() },
    { id: 'sunday', d: '2026-08-23', start: new Date('2026-08-23T12:00:00').getTime() },
    { id: 'boundary', d: '2026-07-28', start: now - 30 * 86400000 },
    { id: 'inside', d: '2026-07-29', start: now - 29 * 86400000 },
  ]

  it('preserves calendar-week, strict trailing-day, and all-history semantics', () => {
    expect(muscleBalanceWindow(workouts, 7, now, '2026-08-27').map(w => w.id)).toEqual(['monday'])
    expect(muscleBalanceWindow(workouts, 30, now, '2026-08-27').map(w => w.id)).toEqual(['monday', 'sunday', 'inside'])
    expect(muscleBalanceWindow(workouts, 0, now, '2026-08-27')).toEqual(workouts)
  })

  it('uses relative levels and canonical order to break load ties', () => {
    const load = { 'mid-chest': 2, 'front-deltoid': 2, biceps: 1 }
    expect(rankOf(load).worked).toEqual(['front-deltoid', 'mid-chest', 'biceps'])
    expect(levelsOf(load)).toMatchObject({ 'front-deltoid': 4, 'mid-chest': 4, biceps: 2, abs: 0 })
  })

  it('keeps catalogue precedence and deleted-custom snapshot weights', () => {
    const known = { id: '0025', muscleGroups: ['quadriceps'], sets: [{ done: true }] }
    const deleted = { id: 'deleted', muscleSnapshot: { muscleWeights: { chest: 1 } }, sets: [{ done: true }] }
    expect(loadOfWorkouts([{ entries: [known] }])).toMatchObject({
      ...flatChest, triceps: 0.4, 'front-deltoid': 0.4, biceps: 0.4, serratus: 0.4,
    })
    expect(loadOfWorkouts([{ entries: [deleted] }])).toEqual(flatChest)
  })
})

describe('loadOfWeekPlan', () => {
  const chest = { id: 'ex', sets: 3, muscleWeights: { chest: 1, triceps: 0.5 } }
  it('shades the current week and skips the other week of a cycle', () => {
    const S = {
      weekStart: 1,
      weekCycle: 2,
      weekAnchor: '2026-09-21',
      week: { 1: ['r1'] },
      weekB: { 1: ['r2'] },
      routines: [
        { id: 'r1', ex: [chest] },
        { id: 'r2', ex: [{ id: 'ex2', sets: 4, muscleWeights: { quadriceps: 1 } }] },
      ],
    }
    expect(loadOfWeekPlan(S, '2026-09-21')['mid-chest']).toBe(3)
    expect(loadOfWeekPlan(S, '2026-09-21').quadriceps).toBeUndefined()
    expect(loadOfWeekPlan(S, '2026-09-28').quadriceps).toBe(4)
  })
})

describe('MUSCLE_NAME as i18n keys', () => {
  const packs = import.meta.glob('../locales/*.js', { eager: true })
  it('every display name is a key in every locale pack', () => {
    expect(Object.keys(packs).length).toBe(1)
    for (const [file, mod] of Object.entries(packs)) {
      const missing = Object.values(MUSCLE_NAME).filter(name => !(name in mod.default))
      expect(missing, file).toEqual([])
    }
  })
})
