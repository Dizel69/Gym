import { describe, it, expect } from 'vitest'
import { nextPrescription, sessionsFor, stallCount } from './progression.js'
import { buildSessionEntries } from './session-start.js'
import { best1RM, e1rmSeries, estimate1RM } from './onerm.js'
import { EXDB, isAssisted } from './exercises.js'

// A plainly loaded lift, same choice as progression.test.js: not bodyweight, not assisted,
// not a lower-body jump, so the step in these tests is the one each config sets.
const LIFT = EXDB.find(e => e.bp !== 'cardio' && !['upper legs', 'lower legs', 'back', 'hips', 'glutes'].includes(e.bp) && !['body weight', 'band', 'resistance band'].includes(e.eq) && !isAssisted(e.id)).id
const ASSISTED = '0017'

const state = workouts => ({ unit: 'kg', exWeights: {}, workouts })

// One finished rep session. `performed` defaults to a clean `sets` of `reps`.
function logged(d, { reps, sets = 3, weight, performed, target, noTarget, noProg, warmup }) {
  const repsDone = performed || Array.from({ length: sets }, () => reps)
  const work = repsDone.map(r => ({ w: weight, r, done: true }))
  return {
    d,
    entries: [{
      id: LIFT,
      ...(noTarget ? {} : { target: { sets, reps, weight, ...target } }),
      ...(noProg ? { noProg: true } : {}),
      sets: warmup ? [warmup, ...work] : work,
    }],
  }
}

const plan = (reps, weight, extra = {}) => ({ id: LIFT, sets: 3, reps, weight, prog: 'linear', inc: 2.5, ...extra })

describe('rep lines: same exercise, different planned reps', () => {
  it('opens a 3×8 plan at 8 reps and the 8-rep line’s weight after a later 70×12', () => {
    // Clean 80×8, then the other scheme: 70×12, 70×12, 70×10. The 8s were a hit, so the
    // line steps up. It must not open as 70×12.
    const S = state([
      logged('2026-05-01', { reps: 8, weight: 80 }),
      logged('2026-05-08', { reps: 12, weight: 70, performed: [12, 12, 10] }),
    ])
    const [entry] = buildSessionEntries(S, { id: 'legs-shoulders', ex: [plan(8, 80)] })
    expect(entry.plan.kind).toBe('up')
    expect(entry.plan.weight).toBe(82.5)
    expect(entry.sets.every(s => s.r === 8 && s.w === 82.5)).toBe(true)
    expect(entry.target.repsTop).toBe(8)
  })

  it('raises the weight in both routines that share 3×12', () => {
    const S = state([logged('2026-05-01', { reps: 12, weight: 40 })])
    const a = buildSessionEntries(S, { id: 'a', ex: [plan(12, 40)] })
    const b = buildSessionEntries(S, { id: 'b', ex: [plan(12, 25)] })
    expect(a[0].sets.every(s => s.r === 12 && s.w === 42.5)).toBe(true)
    expect(b[0].sets.every(s => s.r === 12 && s.w === 42.5)).toBe(true)
  })

  it('does not let misses on the 12-rep line stall or deload the 8-rep line', () => {
    const S = state([
      logged('2026-05-01', { reps: 8, weight: 80 }),
      logged('2026-05-02', { reps: 12, weight: 70, performed: [12, 12, 10] }),
      logged('2026-05-03', { reps: 12, weight: 70, performed: [12, 12, 10] }),
      logged('2026-05-04', { reps: 12, weight: 70, performed: [12, 12, 10] }),
    ])
    const cfg = plan(8, 80)
    const line = sessionsFor(S, LIFT, cfg)
    expect(line.map(s => s.d)).toEqual(['2026-05-01'])
    expect(stallCount(line, 'linear')).toBe(0)
    const p = nextPrescription(S, cfg)
    expect(p.kind).toBe('up')
    expect(p.weight).toBe(82.5)
    expect(p.kind).not.toBe('deload')
  })

  it('seeds an empty line from the best estimated 1RM of the other line', () => {
    // 90×8 → Epley 114. A 12-rep line with no sessions of its own inverts that:
    // 114 / (1 + 12/30) = 81.428…, snapped to a 1 kg step.
    const S = state([logged('2026-05-01', { reps: 8, weight: 90 })])
    expect(estimate1RM(90, 8)).toBe(114)
    const cfg = plan(12, 70, { inc: 1 })
    const [entry] = buildSessionEntries(S, { id: 'shoulders-legs', ex: [cfg] })
    expect(entry.plan.kind).toBe('seed')
    expect(entry.plan.weight).toBe(81)
    expect(entry.sets.every(s => s.r === 12 && s.w === 81)).toBe(true)
    expect(entry.target.reps).toBe(12)
  })

  it('keeps the template when the exercise has neither this line nor an estimated 1RM', () => {
    const S = state([logged('2026-05-01', { reps: 15, weight: 40 })])
    expect(estimate1RM(40, 15)).toBeNull()
    const [entry] = buildSessionEntries(S, { id: 'r', ex: [plan(8, 80)] })
    expect(entry.plan.kind).toBe('first')
    expect(entry.sets.every(s => s.r === 8 && s.w === 80)).toBe(true)
  })

  it('reads a targetless miss of 12, 12, 10 as the 12-rep line', () => {
    const S = state([{
      d: '2026-05-01',
      entries: [{
        id: LIFT,
        sets: [
          { w: 70, r: 12, done: true },
          { w: 70, r: 12, done: true },
          { w: 70, r: 10, done: true },
        ],
      }],
    }])
    expect(sessionsFor(S, LIFT, plan(12, 70))).toHaveLength(1)
    expect(sessionsFor(S, LIFT, plan(10, 70))).toHaveLength(0)
    expect(sessionsFor(S, LIFT, plan(8, 80))).toHaveLength(0)
  })

  it('ignores warm-up reps when a targetless session is placed on a line', () => {
    const S = state([logged('2026-05-01', {
      reps: 8, weight: 80, noTarget: true,
      warmup: { w: 40, r: 5, done: true, phase: 'warmup' },
    })])
    expect(sessionsFor(S, LIFT, plan(8, 80))).toHaveLength(1)
    expect(sessionsFor(S, LIFT, plan(5, 40))).toHaveLength(0)
  })

  it('still shares one line across linear 12 and double progression whose top is 12', () => {
    const S = state([logged('2026-05-01', { reps: 12, weight: 40 })])
    const dbl = plan(12, 40, { prog: 'double', repsMin: 8 })
    const p = nextPrescription(S, dbl)
    expect(p.kind).toBe('up')
    expect(p.weight).toBe(42.5)
    expect(p.reps).toBe(8)
  })

  it('does not glue linear 8 onto a double range whose top is 12', () => {
    const S = state([logged('2026-05-01', { reps: 8, weight: 80 })])
    const p = nextPrescription(S, plan(12, 50, { prog: 'double', repsMin: 8 }))
    expect(p.kind).not.toBe('up')
    expect(sessionsFor(S, LIFT, plan(12, 50, { prog: 'double', repsMin: 8 }))).toHaveLength(0)
  })

  it('keeps a deload of the 8-rep line on 8 reps when a 12-rep session is the latest log', () => {
    const S = state([
      logged('2026-05-01', { reps: 8, weight: 80, performed: [6, 6, 6] }),
      logged('2026-05-02', { reps: 8, weight: 80, performed: [6, 6, 6] }),
      logged('2026-05-03', { reps: 8, weight: 80, performed: [6, 6, 6] }),
      logged('2026-05-04', { reps: 12, weight: 70, performed: [12, 12, 12] }),
    ])
    const [entry] = buildSessionEntries(S, { id: 'legs', ex: [plan(8, 80)] })
    expect(entry.plan.kind).toBe('deload')
    expect(entry.sets.every(s => s.r === 8)).toBe(true)
    expect(entry.sets.every(s => s.w < 80)).toBe(true)
    expect(entry.target.reps).toBe(8)
    expect(entry.target.repsTop).toBe(8)
  })
})

describe('estimated 1RM stays one series per exercise', () => {
  it('sees completed sets from both rep lines', () => {
    const S = {
      workouts: [
        { d: '2026-05-01', start: 1, entries: [{ id: LIFT, sets: [{ w: 90, r: 8, done: true }] }] },
        { d: '2026-05-08', start: 2, entries: [{ id: LIFT, sets: [{ w: 70, r: 12, done: true }] }] },
      ],
    }
    expect(e1rmSeries(S, LIFT).map(p => p.y)).toEqual([estimate1RM(90, 8), estimate1RM(70, 12)])
    expect(best1RM(S, LIFT)).toMatchObject({ est: 114, w: 90, r: 8, d: '2026-05-01' })
  })
})

describe('lines that must stay keyed by exercise id', () => {
  it('still progresses an assistance machine from the latest session, whatever its reps were', () => {
    const cfg = { id: ASSISTED, sets: 1, reps: 12, weight: 30, prog: 'linear', inc: 5 }
    const S = state([{
      d: '2026-05-01',
      entries: [{ id: ASSISTED, target: { sets: 1, reps: 8, weight: 30 }, sets: [{ w: 30, r: 8, done: true }] }],
    }])
    const p = nextPrescription(S, cfg)
    expect(p.kind).toBe('up')
    expect(p.weight).toBe(25)
  })

  it('does not seed a line from a noProg session', () => {
    const S = state([logged('2026-05-01', { reps: 12, weight: 70, noProg: true })])
    const p = nextPrescription(S, plan(8, 80))
    expect(p.kind).toBe('first')
    expect(p.weight).toBeUndefined()
  })
})
