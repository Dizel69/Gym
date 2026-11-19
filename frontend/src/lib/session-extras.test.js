import { describe, it, expect } from 'vitest'
import { parseTempo, tempoSteps, stepAt } from './tempo.js'
import { nextBandsUp, bandText, cleanBands } from './bands.js'
import { deloadSets, addDeload, isDeloadDay } from './deload-cycle.js'
import { weekKey, todayISO } from './format.js'
import { startRun, tickRun, doneStep, defaultCircuit } from './circuit.js'
import { honestEnd, decideForgotten } from './forgotten-workout.js'
import { dateFromFile } from './progress-photos.js'
import { buildSessionEntries } from './session-start.js'

describe('tempo', () => {
  it('reads 3-1-1-0 as lower, pause, lift, no squeeze', () => {
    expect(parseTempo('3-1-1-0')).toMatchObject({ down: 3, bottom: 1, up: 1, top: 0 })
    const steps = tempoSteps('3-1-1-0', 1)
    expect(steps.map(s => s.phase)).toEqual(['down', 'bottom', 'up'])
    expect(stepAt(steps, 0).step.phase).toBe('down')
    expect(stepAt(steps, 3).step.phase).toBe('bottom')
  })
})

describe('bands', () => {
  const list = cleanBands([
    { id: 'y', name: 'Yellow', color: '#f2c94c', kg: 5 },
    { id: 'r', name: 'Red', color: '#eb5757', kg: 10 },
  ])
  it('reads a set as the band names and offers the next one', () => {
    expect(bandText(['r', 'y'], list)).toBe('Red + Yellow')
    expect(nextBandsUp(['y'], list)).toEqual(['r'])
  })
})

describe('deload weeks', () => {
  it('keeps 60% of the sets, at least one', () => {
    expect(deloadSets(5)).toBe(3)
    expect(deloadSets(1)).toBe(1)
  })
  it('builds a lighter session that does not count', () => {
    const st = { unit: 'kg', workouts: [], exWeights: {}, routines: [], weekStart: 1 }
    addDeload(st, weekKey(todayISO(), 1))
    expect(isDeloadDay(st)).toBe(true)
    const entries = buildSessionEntries(st, { id: 'r', ex: [{ id: '0025', sets: 5, reps: 8, weight: 60 }] })
    const work = entries[0].sets.filter(s => !s.warmup && s.phase !== 'warmup')
    expect(work).toHaveLength(3)
    expect(work.every(s => s.w === 60)).toBe(true)
    expect(entries[0].noProg).toBe(true)
  })
})

describe('forgotten workout', () => {
  it('ends at the last set plus its rest, not at the moment someone notices', () => {
    const A = { start: 1_000, entries: [{ sets: [{ done: true, at: 10 * 60 * 1000, r: 8, w: 60 }] }] }
    const now = 3 * 60 * 60 * 1000
    expect(honestEnd(A, { restSec: 90, now })).toBe(10 * 60 * 1000 + 90 * 1000)
  })
  it('asks after the quiet spell and finishes after the grace', () => {
    const A = { start: 0, entries: [{ sets: [{ done: true, at: 0, r: 5, w: 20 }] }] }
    const ask = decideForgotten({ A, now: 45 * 60 * 1000, prefs: { askMin: 45, graceMin: 5 }, restSec: 90 })
    expect(ask.state).toBe('ask')
    const ended = decideForgotten({ A, now: 51 * 60 * 1000, prefs: { askMin: 45, graceMin: 5 }, askedAt: 45 * 60 * 1000, restSec: 90 })
    expect(ended.state).toBe('end')
    expect(ended.endAt).toBe(90 * 1000)
  })
  it('a second look does not ask while the rest is still running', () => {
    const A = { start: 0, entries: [] }
    expect(decideForgotten({ A, now: 999999, resting: true }).state).toBe('active')
  })
})

describe('circuits', () => {
  it('starts on get ready and moves on when the step is done', () => {
    const cfg = defaultCircuit('tabata')
    const stations = [{ idx: 0, id: 'ex', mode: 'reps', reps: 8, w: 0, sec: 0, base: 0 }]
    const run = startRun({ cfg, stations, unit: [0] }, 0)
    expect(tickRun(run, 1000).run.i).toBe(0)
    const moved = doneStep(run, 10_000)
    expect(moved.run.i).toBeGreaterThan(0)
  })
})

describe('photo dates', () => {
  it('reads the date written in the file', () => {
    const bytes = new TextEncoder().encode('....2024:05:01 09:30:00....')
    expect(dateFromFile(bytes, 'img.jpg', 0)).toBe('2024-05-01')
  })
})
