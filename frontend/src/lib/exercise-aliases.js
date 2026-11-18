// Other names for one exercise (a FitNotes title, a name you used to search). The catalogue
// entry stays itself: a search for an alias finds it, and the name on screen does not change.
const MAX_ALIASES = 20
const MAX_LENGTH = 80
let overrides = {}

// Names a catalogue exercise already had before its Russian title was the one on screen.
const BUILTIN = {
  '0536': ['Выпад передача через с гирей'],
  '10192': ['Маятник с гирей'],
}

export function normalizeAliases(value) {
  const values = typeof value === 'string' ? value.split(/[,\n]/) : Array.isArray(value) ? value : []
  const seen = new Set()
  return values.filter(v => typeof v === 'string').map(v => v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_LENGTH))
    .filter(v => { const key = v.toLocaleLowerCase(); if (!v || seen.has(key)) return false; seen.add(key); return true })
    .slice(0, MAX_ALIASES)
}

// Register every adopted/restored state, including an empty map when switching profiles.
export const registerExerciseAliases = map => { overrides = map && typeof map === 'object' && !Array.isArray(map) ? map : {} }
export const exerciseAliases = (ex, map = overrides) => normalizeAliases(
  map && Object.hasOwn(map, ex?.id) ? map[ex.id] : (ex?.aliases || BUILTIN[ex?.id]))
