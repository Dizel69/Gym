// A second weekly template. `week` stays week 1 so older profiles keep their schedule.
// `weekB` is week 2. `weekCycle === 2` makes them alternate from `weekAnchor`
// (the ISO date of the first day of week 1). Anything else is a single repeating week.
import { startOfWeek, weekKey, weekStartOf } from './format.js'

export const WEEK_FIELDS = ['week', 'weekB']

export function cycleOn(S) {
  return Number(S?.weekCycle) === 2
}

/** 0 = week 1 (`S.week`), 1 = week 2 (`S.weekB`). */
export function cycleSlot(S, iso) {
  if (!cycleOn(S)) return 0
  const ws = weekStartOf(S)
  const anchor = S.weekAnchor || iso
  const diff = Math.round((startOfWeek(iso, ws) - startOfWeek(anchor, ws)) / 86400000)
  const weeks = Math.trunc(diff / 7)
  return ((weeks % 2) + 2) % 2
}

export function weekField(slot) {
  return slot === 1 ? 'weekB' : 'week'
}

/** The weekday → routine-id map that applies on `iso`. */
export function scheduleFor(S, iso) {
  const field = weekField(cycleSlot(S, iso))
  return S?.[field] || {}
}

/** First day of the current week, stored when the cycle is switched on. */
export function anchorFor(S, iso) {
  return S?.weekAnchor || weekKey(iso, weekStartOf(S))
}
