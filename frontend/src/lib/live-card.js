// What the Android workout notification says. The kind follows the set: a lift is weight × reps,
// cardio is minutes and speed, a carry is metres and the load. A heart rate is added only when a
// reading is actually in range. Nothing here posts the notification.
import { fmtNum } from './format.js'
import { modeOf } from './history.js'
import { t } from './i18n-core.js'

const CHIP_MAX = 7

/** A reading the card may show. Anything outside a human pulse is not a pulse. */
export function liveBpm(bpm) {
  const n = Math.round(Number(bpm))
  return n >= 25 && n <= 250 ? n : null
}

/**
 * A carry, a yoke or a farmer's walk, by the exercise name. A sled leg press and a sledgehammer
 * are not carries: the name has to say carry, farmer, yoke, or a power sled that is pushed,
 * dragged or walked.
 */
export function isCarryName(name) {
  const s = String(name || '').toLowerCase()
  if (/leg press|hack squat|calf|sledge hammer/.test(s)) return false
  if (/\bfarmers?\b|\byoke\b/.test(s)) return true
  if (/\bcarry\b/.test(s)) return true
  if (/\bpower sled\b/.test(s) && /\b(push|drag|walk)\b/.test(s)) return true
  return false
}

/** lift, hold, cardio or carry. */
export function liveKind(name, cfg, set) {
  if (cfg?.mode === 'distance' || Number(set?.m) > 0) return 'carry'
  const mode = modeOf(cfg || {})
  if (mode === 'cardio') return 'cardio'
  if (mode === 'time') return 'hold'
  if (isCarryName(name)) return 'carry'
  return 'lift'
}

function clip(s, max = 90) {
  const one = String(s || '').replace(/\s+/g, ' ').trim()
  return one.length <= max ? one : one.slice(0, max - 1).trimEnd() + '…'
}

function load(set, cfg, unit) {
  const w = Number(set?.w)
  const fromSet = Number.isFinite(w) && w > 0 ? w : 0
  const fromPlan = !fromSet && Number(cfg?.weight) > 0 ? Number(cfg.weight) : 0
  const n = fromSet || fromPlan
  return n > 0 ? `${fmtNum(n)} ${unit || 'kg'}` : ''
}

function liftLine(set) {
  return `${fmtNum(set?.w || 0)} × ${set?.r ?? set?.sec ?? 0}`
}

function holdLine(set) {
  const sec = Math.max(0, Math.round(Number(set?.sec) || 0))
  const clock = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0')
  return Number(set?.w) > 0 ? `${clock} · ${fmtNum(set.w)}` : clock
}

function cardioLine(set, cfg) {
  const min = set?.min ?? cfg?.min ?? 0
  const speed = set?.speed ?? cfg?.speed ?? 0
  let line = `${fmtNum(min)} min @ ${fmtNum(speed)} km/h`
  const inc = Number(set?.incline ?? cfg?.incline)
  if (Number.isFinite(inc) && inc > 0) line += ` · ${fmtNum(inc)}%`
  return line
}

function carryLine(set, cfg, unit) {
  const m = Number(set?.m ?? cfg?.m)
  const w = load(set, cfg, unit)
  if (m > 0 && w) return `${fmtNum(m)} m · ${w}`
  if (m > 0) return `${fmtNum(m)} m`
  if (w && Number(set?.r) > 0) return `${w} · ${fmtNum(set.r)}`
  return w || liftLine(set)
}

function detailOf(kind, set, cfg, unit) {
  if (kind === 'cardio') return cardioLine(set, cfg)
  if (kind === 'carry') return carryLine(set, cfg, unit)
  if (kind === 'hold') return holdLine(set)
  return liftLine(set)
}

function withHr(line, bpm) {
  const n = liveBpm(bpm)
  return n ? `${line} · ${t('{0} bpm', n)}` : line
}

function chipText(text) {
  const s = String(text || '')
  return s.length > 0 && s.length < CHIP_MAX ? s : ''
}

function chipOf({ kind, set, cfg, bpm, done, total, resting, restLeft }) {
  const hr = liveBpm(bpm)
  const frac = `${done}/${total}`
  if (resting) {
    const left = chipText(`${Math.max(0, Math.round(Number(restLeft) || 0))}s`)
    return left || chipText(frac)
  }
  if (hr && (kind === 'cardio' || kind === 'carry')) return String(hr)
  if (kind === 'cardio') return chipText(fmtNum(set?.speed ?? cfg?.speed ?? 0))
  if (kind === 'carry') {
    const m = Number(set?.m ?? cfg?.m)
    if (m > 0) {
      const metres = chipText(`${fmtNum(m)}m`)
      if (metres) return metres
    }
  }
  if (kind === 'lift') return chipText(`${fmtNum(set?.w || 0)}×${set?.r ?? 0}`)
  if (kind === 'hold') return chipText(holdLine(set).split(' · ')[0])
  return chipText(frac)
}

function actionsFor({ kind, resting, paused }) {
  const pause = { id: 'pause', title: paused ? t('Resume') : t('Pause') }
  const log = { id: 'log', title: t('Log set') }
  if (resting) return [log, { id: 'rest', title: t('+15s') }, pause]
  if (kind === 'cardio' || kind === 'hold') return [log, pause]
  if (kind === 'carry') return [log, { id: 'weight', title: t('+ weight') }, pause]
  return [log, { id: 'weight', title: t('+ weight') }, { id: 'reps', title: t('+ rep') }]
}

/**
 * The notification for the set that is up now.
 * `finished` every set is already logged. `resting` a rest is counting.
 */
export function liveCardModel({
  name = '',
  set = null,
  cfg = null,
  resting = false,
  paused = false,
  restLeft = 0,
  unit = 'kg',
  bpm = null,
  done = 0,
  total = 0,
  finished = false,
} = {}) {
  const kind = finished ? 'lift' : liveKind(name, cfg, set)
  const detail = finished ? '' : detailOf(kind, set, cfg, unit)
  let title = name || 'openGym'
  let body = detail || name || ''
  if (finished) {
    title = name || 'openGym'
    body = `${done}/${total}`
  } else if (paused) {
    title = t('Paused')
    body = detail || name
  } else if (resting) {
    title = t('Rest')
    body = detail
      ? `${t('{0}s · up next {1}', Math.max(0, Math.round(Number(restLeft) || 0)), name)} · ${detail}`
      : t('{0}s · up next {1}', Math.max(0, Math.round(Number(restLeft) || 0)), name)
  }
  body = withHr(body, bpm)
  return {
    kind,
    title,
    body: clip(body),
    chip: chipOf({ kind, set, cfg, bpm, done, total, resting: resting && !paused, restLeft }),
    actions: finished ? [] : actionsFor({ kind, resting: resting && !paused, paused }),
    done,
    total,
  }
}
