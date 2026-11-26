// Four taps before a workout (v1.4.5). Off until Settings turns it on. Every answer is optional,
// and Skip starts the day as planned. A rough day may offer 10% lighter open sets or one open
// work set fewer. Nothing is picked for you, and that session stays out of progression.
//
//   S.dayForm = { '2026-11-26': { sleep: 2, energy: 3, sore: 4, stress: 2, lighter: 'load', _ts } }
//
// Sleep and energy: 5 is great. Soreness and stress: 5 is a lot, so the score turns them round.
// The deload suggestion reads these through setDailyFormSource (lib/deload-cycle.js). Two low
// weeks count only together with lifts that are not climbing. Weights, 1RM and the plan stay put.
import { isWarmupRow, hasCompletedWork, isSideSet, syncSideAggregate } from './workout-model.js'
import { rerampWarmups } from './history.js'
import { weightIncrement } from './progression.js'
import { isAssisted } from './exercises.js'
import { setDailyFormSource } from './deload-cycle.js'

export const FORM_KEYS = ['sleep', 'energy', 'sore', 'stress']
const INVERTED = new Set(['sore', 'stress'])
/** At or below this average (1 rough … 5 great) the check-in offers a lighter day. */
export const ROUGH_AT = 2.5
export const LIGHTER_KINDS = ['load', 'sets']
export const LIGHTER_PCT = 10

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
const rating = v => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null)
const round1 = v => Math.round(v * 10) / 10

/** A stored entry read back, or null when the day has no answer. */
export function readForm(entry) {
  if (!isMap(entry)) return null
  const out = {}
  let any = false
  for (const k of FORM_KEYS) { out[k] = rating(entry[k]); if (out[k] != null) any = true }
  if (!any) return null
  out.lighter = LIGHTER_KINDS.includes(entry.lighter) ? entry.lighter : null
  return out
}

/** The check-in of `iso`, or null. */
export const formOf = (S, iso) => readForm(isMap(S?.dayForm) ? S.dayForm[iso] : null)

/** Every answered day, oldest first. */
export function formDays(S) {
  const map = isMap(S?.dayForm) ? S.dayForm : {}
  return Object.keys(map).sort().map(d => { const f = readForm(map[d]); return f ? { d, ...f } : null }).filter(Boolean)
}

/** How good a day looks, 1 (rough) to 5 (great). null when nothing was answered. */
export function formScore(f) {
  if (!f) return null
  const vals = FORM_KEYS.map(k => (f[k] == null ? null : INVERTED.has(k) ? 6 - f[k] : f[k])).filter(v => v != null)
  if (!vals.length) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
}

/** Two answers at least, and a score at or under ROUGH_AT. */
export function isRough(f) {
  if (!f) return false
  const given = FORM_KEYS.filter(k => f[k] != null).length
  const score = formScore(f)
  return given >= 2 && score != null && score <= ROUGH_AT
}

/** 'ask' when the switch is on and today has no answer yet. */
export function checkinMode(S, today) {
  if (!S || S.dailyForm !== true) return null
  return formOf(S, today) ? null : 'ask'
}

/** S.dayForm with `iso` set to the answers in `f`. Empty answers clear the ratings. */
export function withForm(map, iso, f, now = Date.now()) {
  const clean = readForm(f)
  const entry = { _ts: now }
  if (clean) {
    for (const k of FORM_KEYS) if (clean[k] != null) entry[k] = clean[k]
    if (clean.lighter) entry.lighter = clean.lighter
  }
  return { ...(isMap(map) ? map : {}), [iso]: entry }
}

const openWork = entry => (entry?.sets || []).map((s, i) => ({ s, i })).filter(x => x.s && !isWarmupRow(x.s) && !hasCompletedWork(x.s))
const assistedEntry = entry => isAssisted(entry?.id) || entry?.target?.assisted === true

/** 10% off, snapped down onto the loading step. A step that cannot get lighter stays. */
export function lighterWeight(w, step) {
  const n = Number(w)
  if (!(n > 0)) return Number.isFinite(n) ? n : 0
  const raw = n * (1 - LIGHTER_PCT / 100)
  if (!(step > 0)) {
    const r = round1(raw)
    return r < n ? r : n
  }
  let down = round1(Math.floor((raw + 1e-9) / step) * step)
  if (!(down > 0) || down >= n) return n
  return down
}

function weightOf(row) {
  if (isSideSet(row)) return Math.max(Number(row.sides.L.w) || 0, Number(row.sides.R.w) || 0)
  return Number(row?.w) || 0
}

/**
 * What "go lighter" would change: 'load' takes 10% off open work that has a weight,
 * 'sets' drops one open work set where there are two or more. Assistance machines are
 * left on their logged help — less help would be a harder set.
 */
export function lighterChanges(active, kind) {
  const out = []
  ;(active?.entries || []).forEach((e, i) => {
    const open = openWork(e)
    if (!open.length) return
    if (kind === 'load') {
      if (assistedEntry(e)) return
      if (open.some(x => weightOf(x.s) > 0)) out.push({ entry: i, type: 'weight' })
    } else if (kind === 'sets' && open.length >= 2) {
      out.push({ entry: i, type: 'sets' })
    }
  })
  return out
}

const applyLoad = (s, entry) => {
  const cfg = { ...(entry.target || {}), id: entry.id }
  const step = weightIncrement(cfg, s?.unit)
  for (const { i } of openWork(entry)) {
    const row = entry.sets[i]
    if (isSideSet(row)) {
      entry.sets[i] = syncSideAggregate({
        ...row,
        sides: {
          L: { ...row.sides.L, w: lighterWeight(row.sides.L.w, step) },
          R: { ...row.sides.R, w: lighterWeight(row.sides.R.w, step) },
        },
      })
    } else entry.sets[i] = { ...row, w: lighterWeight(row.w, step) }
  }
  entry.sets = rerampWarmups(entry.sets, step)
}

const applySets = entry => {
  const open = openWork(entry)
  if (open.length < 2) return
  const drop = open[open.length - 1].i
  entry.sets = entry.sets.filter((_, i) => i !== drop)
}

const pauseProgression = active => {
  active.noProg = true
  for (const entry of active.entries || []) if (entry) entry.noProg = true
}

/**
 * Applies "go lighter" to the session in the store draft `s`. Returns how many exercises
 * changed. With none, the session and its progression flag stay as they were.
 */
export function goLighter(s, kind) {
  if (!s?.active || !LIGHTER_KINDS.includes(kind)) return 0
  const changes = lighterChanges(s.active, kind)
  if (!changes.length) return 0
  for (const c of changes) {
    const entry = s.active.entries[c.entry]
    if (!entry) continue
    if (c.type === 'weight') applyLoad(s, entry)
    else applySets(entry)
  }
  pauseProgression(s.active)
  s.active.lighter = kind
  return changes.length
}

/** Whether a session can be made lighter this way. */
export const canGoLighter = (active, kind) => lighterChanges(active, kind).length > 0

/** Check-ins for the deload suggestion: 0 rough … 1 great, between two days inclusive. */
export function dailyFormSource(S, from, to) {
  if (!S) return []
  return formDays(S).filter(f => f.d >= from && f.d <= to)
    .map(f => ({ d: f.d, score: Math.round(((formScore(f) - 1) / 4) * 100) / 100 }))
}

/** Hands the check-ins to the deload suggestion. Called once at start-up (main.jsx). */
export const registerDailyFormSource = () => setDailyFormSource(dailyFormSource)
