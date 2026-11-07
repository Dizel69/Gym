import { describe, expect, it } from 'vitest'
import { EXALIAS, EXDB } from './exercises-data.js'
import { CATEGORIES, EXIDX, categoriesOf, exOr, figureOf, gifSrc, imgSrc } from './exercises.js'

describe('catalogue of 5632 exercises', () => {
  const byId = Object.fromEntries(EXDB.map(exercise => [exercise.id, exercise]))

  it('keeps every old exercise on its old id', () => {
    expect(EXDB).toHaveLength(5632)
    expect(byId['0001'].n).toBe('3/4 sit-up')
    expect(byId['0025'].n).toBe('barbell bench press')
    expect(byId['0032'].n).toBe('barbell deadlift')
    expect(byId['0652'].n).toBe('pull-up')
    expect(byId['0662'].n).toBe('push-up')
  })

  it('follows the body in Settings, and only changes the picture', () => {
    const bench = byId['0025']
    expect(figureOf({})).toBe('male')
    expect(figureOf({ body: 'female' })).toBe('female')
    expect(figureOf({ body: 'female', exFigure: 'male' })).toBe('male')
    expect(imgSrc(bench, 'female')).toBe('img/' + bench.fv + '.webp')
    expect(gifSrc(bench, 'female')).toBe('gif/' + bench.fv + '.mp4')
    expect(imgSrc(bench, 'male')).toBe('img/' + bench.id + '.webp')
    expect(gifSrc(bench, 'male')).toBe('gif/' + bench.id + '.mp4')
    expect(gifSrc(byId['0652'], 'female')).toBe(gifSrc(byId['0652'], 'male'))
  })

  it('resolves a drawing id to the exercise, and does not list it twice', () => {
    expect(EXIDX[byId['0025'].fv]).toBe(EXIDX['0025'])
    expect(exOr(byId['0025'].fv).id).toBe('0025')
    expect(exOr(byId['0025'].fv).missing).toBeUndefined()
    expect(Object.keys(EXIDX)).not.toContain(byId['0025'].fv)
    expect(Object.values(EXIDX).filter(exercise => exercise.id === '0025')).toHaveLength(1)
    for (const id of Object.keys(EXALIAS)) expect(EXDB.some(exercise => exercise.id === id), id).toBe(false)
  })

  it('offers training types in a fixed order, and only the ones in the list', () => {
    expect(categoriesOf(EXDB)).toEqual(CATEGORIES)
    expect(categoriesOf([{ cat: 'yoga' }, { cat: 'stretching' }, { n: 'custom' }])).toEqual(['stretching', 'yoga'])
  })
})
