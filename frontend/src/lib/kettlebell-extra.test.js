import { afterEach, describe, expect, test } from 'vitest'
import ru from '../exercise-names/ru.js'
import { KETTLEBELL_EXTRA, KETTLEBELL_REPLACED, replaceRetiredKettlebellIds } from './kettlebell-extra.js'
import { CATALOGUE, EXIDX, gifSrc, imgSrc, searchExercises } from './exercises.js'
import { parsePlan } from './plan-share.js'
import { _setLangState, exerciseNameFor } from './i18n-core.js'
import { musclesOf } from './muscles.js'

const NAMES = {
  'kb-punch': 'Удар с гирей',
  'kb-pass': 'Переброс гири',
  'kb-regrip': 'Перехватка гири',
  'kb-pendulum': 'Маятник с гирей',
  'kb-world': 'Вокруг света с разворотом корпуса',
  'kb-cuckoo': 'Выпад «пролетая над гнездом кукушки»',
  'kb-high-pull': 'Тяга с протяжкой',
  'kb-curl-alt': 'Подъём на бицепс поочерёдно',
}

describe('extra kettlebell exercises', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  test('show in the catalogue with a picture and a Russian name', () => {
    _setLangState('ru', {}, null, ru)
    expect(KETTLEBELL_EXTRA.map(exercise => exercise.id)).toEqual(Object.keys(NAMES))
    for (const extra of KETTLEBELL_EXTRA) {
      const live = CATALOGUE.find(exercise => exercise.id === extra.id)
      expect(live, extra.id).toBeTruthy()
      expect(imgSrc(live), extra.id).toBe(extra.img.startsWith('/') ? extra.img : 'img/' + extra.img)
      expect(gifSrc(live), extra.id).toBe(extra.gif.startsWith('/') ? extra.gif : 'gif/' + extra.gif)
      if (!extra.img.startsWith('/')) expect(extra.gif, extra.id).toMatch(/\.(gif|mp4)$/)
      expect(live.st.length, extra.id).toBeGreaterThan(2)
      expect(exerciseNameFor(live), extra.id).toBe(NAMES[extra.id])
      expect(Object.values(musclesOf(live)).some(weight => weight > 0), extra.id).toBe(true)
    }
    expect(searchExercises(CATALOGUE, 'перебрасывание').map(exercise => exercise.id)).not.toContain('kb-pass')
    expect(searchExercises(CATALOGUE, 'удар гирей').map(exercise => exercise.id)).toContain('kb-punch')
  })

  test('shades the muscles drawn in red on the diagram', () => {
    const of = id => musclesOf(CATALOGUE.find(exercise => exercise.id === id))
    expect(of('kb-punch')['mid-chest']).toBeGreaterThan(0)
    expect(of('kb-punch')['front-deltoid']).toBeGreaterThan(0)
    expect(of('kb-punch').triceps).toBeGreaterThan(0)
    expect(of('kb-punch').obliques).toBeGreaterThan(0)
  })

  test('sends a retired id to the catalogue exercise instead of listing it twice', () => {
    _setLangState('ru', {}, null, ru)
    for (const [from, to] of Object.entries(KETTLEBELL_REPLACED)) {
      expect(CATALOGUE.some(exercise => exercise.id === from), from).toBe(false)
      expect(EXIDX[from].id, from).toBe(to)
    }
    expect(searchExercises(CATALOGUE, 'вращение гири вокруг головы').map(exercise => exercise.id)).toEqual(['2939'])
    const state = {
      routines: [{ ex: [{ id: 'kb-halo' }, { id: 'kb-punch' }] }],
      workouts: [{ entries: [{ id: 'kb-press' }] }],
      active: { entries: [{ id: 'kb-deadlift' }] },
      exWeights: { 'kb-curl': { w: 16 }, '5857': { w: 24 } },
      favEx: ['kb-halo', '2939', 'kb-punch'],
    }
    expect(replaceRetiredKettlebellIds(state)).toBe(true)
    expect(state.routines[0].ex.map(exercise => exercise.id)).toEqual(['2939', 'kb-punch'])
    expect(state.workouts[0].entries[0].id).toBe('3572')
    expect(state.active.entries[0].id).toBe('3322')
    expect(state.exWeights).toEqual({ '5857': { w: 24 } })
    expect(state.favEx).toEqual(['2939', 'kb-punch'])
    expect(replaceRetiredKettlebellIds(state)).toBe(false)
    const parsed = parsePlan({ opengym_plan: 1, routines: [{ id: 'r', name: 'Гиря', ex: [{ id: 'kb-halo', sets: 1, reps: 10 }] }] }, 'kg')
    expect(parsed.routines[0].ex[0].id).toBe('2939')
    expect(parsed.dropped).toBe(0)
  })
})
