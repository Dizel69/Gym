// The next timed hold a rest should start by itself. Reps, cardio and a per-side hold stay
// manual: the chain only continues into a plain hold, and a reps set still to do ends it.
import { isSideSet } from './workout-model.js'

const DEFAULT_HOLD_SEC = 45

/**
 * `{ idx, i, sec }` of the hold to count into after the rest that belongs to `fromIdx`,
 * or null. Walks forward from that exercise. A later reps or cardio set that is not done
 * stops the walk, so a bench between two planks is still a bench.
 */
export function nextAutoHold(active, fromIdx, isTimed) {
  const entries = active?.entries
  if (!entries?.length || active.backfill) return null
  const start = Number.isInteger(fromIdx) && fromIdx >= 0 ? fromIdx : 0
  for (let idx = start; idx < entries.length; idx++) {
    const sets = entries[idx]?.sets || []
    const i = sets.findIndex(s => s && !s.done)
    if (i < 0) continue
    if (!isTimed(idx) || isSideSet(sets[i])) return null
    const sec = Math.max(1, Math.round(Number(sets[i].sec) || DEFAULT_HOLD_SEC))
    return { idx, i, sec }
  }
  return null
}
