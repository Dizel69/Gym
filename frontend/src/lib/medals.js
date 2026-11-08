// Medals are read back from the log, same as the monthly goals. Nothing is stored.
// The three at the top are the best month so far for workouts, tonnage and records.
// The first month that has a number already earns the medal. A later month
// replaces it only when its number is higher. The shelf keeps a medal for every
// month that cleared every goal it was given. The case is shown once any medal exists.
import { goalsForMonth, monthTotals } from './month-goals.js'
import { monthKey, shiftMonth } from './year-review.js'

const ORDER = ['workouts', 'volume', 'records']

function span(workouts, now) {
  let first = ''
  for (const w of workouts) {
    if (typeof w?.d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.d)) {
      const ym = w.d.slice(0, 7)
      if (!first || ym < first) first = ym
    }
  }
  if (!first) return []
  const last = monthKey(now)
  const out = []
  let cursor = first
  while (cursor <= last && out.length < 240) {
    out.push(cursor)
    cursor = shiftMonth(cursor, 1)
  }
  return out
}

export function medalCase(S, now = new Date()) {
  const workouts = S?.workouts || []
  const held = { workouts: null, volume: null, records: null }
  const shelf = []
  for (const ym of span(workouts, now)) {
    const totals = monthTotals(workouts, ym)
    if (totals) {
      for (const id of ORDER) {
        if (!(totals[id] > 0)) continue
        const prev = held[id]
        if (!prev || totals[id] > prev.value) {
          held[id] = { id, ym, value: totals[id], tier: (prev?.tier || 0) + 1 }
        }
      }
    }
    const report = goalsForMonth({ workouts }, ym)
    if (report && report.goals.every(goal => goal.value >= goal.target)) {
      shelf.push({ ym, month: Number(ym.slice(5, 7)) })
    }
  }
  const champions = ORDER.map(id => held[id])
  if (!shelf.length && champions.every(medal => !medal)) return null
  return { champions, shelf: shelf.reverse() }
}
