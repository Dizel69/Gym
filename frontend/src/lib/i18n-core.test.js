import { describe, it, expect } from 'vitest'
import { LANGS, DATE_LOCALES, getLang, t, dateLocale, instrFor, instrIsEnglishFallback, _setLangState } from './i18n-core.js'
import ru from '../locales/ru.js'

describe('languages', () => {
  it('offers English and Russian', () => {
    expect(Object.keys(LANGS).sort()).toEqual(['en', 'ru'])
    expect(DATE_LOCALES.en).toBe('en-GB')
    expect(DATE_LOCALES.ru).toBe('ru-RU')
  })

  it('falls back to English for a language this fork does not ship', () => {
    _setLangState('de', { glutes: 'Gesäß' }, null, null)
    expect(getLang()).toBe('en')
    expect(t('glutes')).toBe('glutes')
    _setLangState('en', {}, null, null)
  })

  it('uses the Russian pack when Russian is selected', () => {
    _setLangState('ru', ru, null, null)
    expect(getLang()).toBe('ru')
    expect(dateLocale()).toBe('ru-RU')
    expect(t('Glutes')).toBe('Ягодицы')
    _setLangState('en', {}, null, null)
  })

  it('shows English steps when Russian has no translation for that exercise yet', () => {
    const ex = { id: 'new', n: 'new move', st: [] }
    _setLangState('ru', {}, { old: ['Лягте'] }, null, { new: ['Lie down.'] })
    expect(instrFor({ id: 'old' })).toEqual(['Лягте'])
    expect(instrIsEnglishFallback({ id: 'old' })).toBe(false)
    expect(instrFor(ex)).toEqual(['Lie down.'])
    expect(instrIsEnglishFallback(ex)).toBe(true)
    _setLangState('en', {}, null, null)
  })
})
