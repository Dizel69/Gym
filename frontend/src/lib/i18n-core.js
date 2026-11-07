// Runtime-agnostic core of the i18n module: state, constants and readers (t, dateLocale,
// instrFor, exerciseNameFor, getLang). Plain Node-loadable — the browser-only pieces
// (import.meta.glob lazy
// loads, the React subscription hook) live in i18n.js and re-export from here.

export const LANGS = {
  en: 'English',
  ru: 'Русский',
}
export const INSTR_LANGS = ['en', 'ru']
export const EXERCISE_NAME_LANGS = ['ru']
export const DATE_LOCALES = {
  en: 'en-GB',
  ru: 'ru-RU',
}

// No locale is derived from another. The hook stays so a future pair (one pack, one
// spelling change) can plug in without a second copy of every string.
export const DERIVED_LOCALES = {}

// The language whose packs a locale actually loads: a derived locale reads its base's, every
// other language its own. Used for the INSTR_LANGS/EXERCISE_NAME_LANGS membership tests too,
// so de-CH gains instructions and exercise names exactly when de does, with no second entry
// to remember to add.
export const baseLang = l => DERIVED_LOCALES[l]?.base || l

// Applies a derived locale's transform to a loaded pack, returning it unchanged for a language
// that is not derived. Packs are trees of strings: the locale pack is flat { source: target },
// instruction packs are { exId: [steps] }, exercise-name packs { exId: name }.
export function derivePack(l, pack) {
  const transform = DERIVED_LOCALES[l]?.transform
  if (!transform || !pack) return pack
  const walk = v =>
    typeof v === 'string' ? transform(v)
      : Array.isArray(v) ? v.map(walk)
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, inner]) => [k, walk(inner)]))
          : v
  return walk(pack)
}

let lang = 'en'                 // set only by _setLangState, called from i18n.js setLang
let dict = {}                   // current locale pack (empty = English fallback)
let instr = null                // { exId: [steps] } for the current language
let instrEn = null              // English steps, used when a translation has no entry yet
let exerciseNames = null        // { exId: translated name }, null = original catalogue name
let version = 0                 // bumped on every setLang; drives the React subscription selector

export const getLang = () => lang
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'
export const getVersion = () => version

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}

// Instructions for an exercise in the current language. A translation that does not
// know this exercise yet falls back to the steps stored on the exercise (the kettlebell
// extras are written in Russian there), and only then to the English catalogue.
export const instrFor = ex => {
  const own = instr && instr[ex?.id]
  if (own && own.length) return own
  if (ex?.st && ex.st.length) return ex.st
  const en = instrEn && instrEn[ex?.id]
  return en && en.length ? en : []
}
// True when the steps on screen are the English catalogue standing in for a missing
// translation. Steps written on the exercise itself are not labelled that way.
export const instrIsEnglishFallback = ex => {
  const own = instr && instr[ex?.id]
  if (own && own.length) return false
  if (ex?.st && ex.st.length) return false
  return !!(instrEn && instrEn[ex?.id] && instrEn[ex.id].length)
}

// Built-in catalogue names are bilingual when a complete translated name pack is active.
// User-created exercises have no entry in the pack and keep their exact chosen name.
export const exerciseNameFor = ex => {
  const translated = exerciseNames && ex && exerciseNames[ex.id]
  if (!translated) return ex?.n || ''
  // Some names (Burpee, Pilates, brand/model terms) are the established term in the target
  // language too. Repeating an identical loanword in parentheses adds noise rather than
  // context. Compared in the active language's own casing rules, not hardcoded to one —
  // this only ever differs from ordinary casing for languages with locale-specific rules
  // (e.g. Turkish dotless i), which does not include any language shipped here today.
  if (translated.toLocaleLowerCase(lang) === ex.n.toLocaleLowerCase('en')) return translated
  // The Russian catalogue is shown in Russian. Search still matches the English title.
  if (baseLang(lang) === 'ru') return translated
  return `${translated} (${ex.n})`
}

// Search both the localized and canonical English title without changing persisted data.
export const exerciseNameSearchText = ex => {
  const translated = exerciseNames && ex && exerciseNames[ex.id]
  return translated ? `${translated} ${ex.n}` : (ex?.n || '')
}

// Called by i18n.js's setLang once the locale pack has been loaded — kept here rather than
// exported as setLang because loading packs requires import.meta.glob, which is Vite-only.
// `dict`, `instr` and `exerciseNames` may be null to reset to their English fallbacks.
export function _setLangState(newLang, newDict, newInstr, newExerciseNames, newInstrEn) {
  lang = LANGS[newLang] ? newLang : 'en'
  dict = lang === 'en' ? {} : (newDict || {})
  const base = baseLang(lang)
  instr = INSTR_LANGS.includes(base) ? (newInstr || null) : null
  instrEn = newInstrEn || (base === 'en' ? instr : null)
  exerciseNames = lang === 'en' || !EXERCISE_NAME_LANGS.includes(baseLang(lang))
    ? null
    : (newExerciseNames || null)
  version++
  return version
}
