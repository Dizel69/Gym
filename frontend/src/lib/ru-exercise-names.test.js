import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import ru from '../exercise-names/ru.js'
import { EXDB } from './exercises-data.js'
import {
  EXERCISE_NAME_LANGS, _setLangState, exerciseNameFor, exerciseNameSearchText
} from './i18n-core.js'

describe('Russian exercise names', () => {
  const source = JSON.parse(readFileSync(new URL('../../../scripts/exercise-name-sources/ru.json', import.meta.url), 'utf8'))
  afterEach(() => _setLangState('en', {}, null, null))

  test('covers every built-in exercise', () => {
    expect(Object.keys(ru)).toHaveLength(EXDB.length)
    expect(ru).toEqual(source)
    expect(EXERCISE_NAME_LANGS).toContain('ru')
  })

  test('is Russian, not a copy of the English title', () => {
    for (const exercise of EXDB) {
      expect(ru[exercise.id]?.trim(), exercise.id).toBeTruthy()
      expect(ru[exercise.id], exercise.id).toMatch(/\p{Script=Cyrillic}/u)
      expect(ru[exercise.id], exercise.id).not.toMatch(/\b(?:barbell|dumbbell|cable|bench press|squat|deadlift)\b/i)
    }
  })

  test('uses the names a Russian gym actually says', () => {
    const byId = Object.fromEntries(EXDB.map(exercise => [exercise.id, exercise]))
    expect(ru['0025']).toBe('Жим лёжа со штангой')
    expect(ru['0032']).toBe('Становая тяга со штангой')
    expect(ru['0652']).toBe('Подтягивания')
    expect(ru['0662']).toBe('Отжимания')
    _setLangState('ru', {}, null, ru)
    expect(exerciseNameFor(byId['0025'])).toBe('Жим лёжа со штангой')
    expect(exerciseNameSearchText(byId['0025'])).toContain('barbell bench press')
  })

  test('leaves custom exercises and English alone', () => {
    _setLangState('ru', {}, null, ru)
    expect(exerciseNameFor({ id: 'custom-1', n: 'Мой комплекс' })).toBe('Мой комплекс')
    _setLangState('en', {}, null, null)
    expect(exerciseNameFor(EXDB[0])).toBe(EXDB[0].n)
  })
})
