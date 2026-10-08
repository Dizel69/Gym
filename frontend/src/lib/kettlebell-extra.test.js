import { afterEach, describe, expect, test } from 'vitest'
import ru from '../exercise-names/ru.js'
import { KETTLEBELL_EXTRA } from './kettlebell-extra.js'
import { CATALOGUE, gifSrc, imgSrc, searchExercises } from './exercises.js'
import { _setLangState, exerciseNameFor } from './i18n-core.js'
import { musclesOf } from './muscles.js'

const NAMES = {
  'kb-halo': 'Вращение гири вокруг головы',
  'kb-around': 'Вращение гири вокруг корпуса',
  'kb-punch': 'Удар с гирей',
}

describe('extra kettlebell exercises', () => {
  afterEach(() => _setLangState('en', {}, null, null))

  test('show in the catalogue with a picture and a Russian name', () => {
    _setLangState('ru', {}, null, ru)
    expect(KETTLEBELL_EXTRA.map(exercise => exercise.id)).toEqual(['kb-halo', 'kb-around', 'kb-punch'])
    for (const extra of KETTLEBELL_EXTRA) {
      const live = CATALOGUE.find(exercise => exercise.id === extra.id)
      expect(live, extra.id).toBeTruthy()
      expect(imgSrc(live), extra.id).toBe(`/kettlebell/${extra.id}.jpg`)
      expect(gifSrc(live), extra.id).toBe(imgSrc(live))
      expect(live.st.length, extra.id).toBeGreaterThan(2)
      expect(exerciseNameFor(live), extra.id).toBe(NAMES[extra.id])
    }
    expect(searchExercises(CATALOGUE, 'перебрасывание').map(exercise => exercise.id)).not.toContain('kb-pass')
    expect(searchExercises(CATALOGUE, 'удар гирей').map(exercise => exercise.id)).toContain('kb-punch')
  })

  test('shades the muscles drawn in red on the diagram', () => {
    const of = id => musclesOf(CATALOGUE.find(exercise => exercise.id === id))
    expect(of('kb-halo')['front-deltoid']).toBeGreaterThan(0)
    expect(of('kb-halo')['side-deltoid']).toBeGreaterThan(0)
    expect(of('kb-around').chest).toBeGreaterThan(0)
    expect(of('kb-around')['rear-deltoid']).toBeGreaterThan(0)
    expect(of('kb-punch').chest).toBeGreaterThan(0)
    expect(of('kb-punch')['front-deltoid']).toBeGreaterThan(0)
    expect(of('kb-punch').triceps).toBeGreaterThan(0)
    expect(of('kb-punch').obliques).toBeGreaterThan(0)
  })
})
