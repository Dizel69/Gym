// A planned substitute for one exercise in a routine: the machine is taken, and the plan
// already says what to do instead. Stored as `subs`, a list of exercise ids. This fork keeps
// one. A running workout offers it as one tap. The exercise it replaces becomes that tap's
// way back. The routine itself is not rewritten.

import { EXIDX, isAssisted, isBodyweightEq, isCardio } from './exercises.js'
import { defaultConfig, isBw, lastEntryFor, modeOf } from './history.js'

export const MAX_BACKUPS = 1

/** Ids that may be stored: strings, not the exercise itself, never itself, at most one. */
export function cleanBackups(list, selfId, known = () => true) {
  if (!Array.isArray(list)) return []
  const out = []
  for (const id of list) {
    if (typeof id !== 'string' || !id || id === selfId || out.includes(id) || !known(id)) continue
    out.push(id)
    if (out.length >= MAX_BACKUPS) break
  }
  return out
}

/** `{ subs }` to spread onto a saved slot, or nothing when there is no backup. */
export function withBackups(list, selfId, known) {
  const subs = cleanBackups(list, selfId, known)
  return subs.length ? { subs } : {}
}

const CARRY = ['sets', 'reps', 'repsMin', 'repsMax', 'weight', 'mode', 'sec', 'min', 'speed', 'restSec', 'note', 'warmupSets', 'warmupWeight', 'warmupReps', 'warmupProg', 'intensifier', 'prog', 'inc', 'deloadFactor', 'bodyweight', 'side', 'assisted', 'tempo', 'incline', 'bands']

function carried(slot) {
  const out = {}
  for (const key of CARRY) if (slot[key] != null) out[key] = slot[key]
  return out
}

function weightFromHistory(S, id, cfg) {
  if (!S || !Array.isArray(S.workouts)) return null
  const last = lastEntryFor(S, id, cfg)
  if (!last) return null
  const planned = Number(last.target?.weight)
  if (Number.isFinite(planned) && planned >= 0) return planned
  const lifted = Number(last.sets?.[0]?.w)
  return lifted > 0 ? lifted : null
}

/**
 * The plan a backup takes over with, for today only. Sets, reps, rest and warm-ups stay
 * the slot's. A lift the backup has already logged opens at that weight, not the slot's,
 * so a barbell number does not land on a dumbbell the lifter has trained lighter. The
 * exercise being left becomes the backup, so the same tap returns to it.
 * Returns null when `backupId` is not a real other exercise. Does not mutate `slot`.
 */
export function backupSlotConfig(slot, backupId, S, known = id => !!EXIDX[id]) {
  const old = slot || {}
  if (!backupId || backupId === old.id || !known(backupId)) return null
  const sameKind = (modeOf(old) === 'cardio') === isCardio(backupId)
  let out
  if (!sameKind) {
    out = {
      ...defaultConfig(backupId),
      ...(old.restSec ? { restSec: old.restSec } : {}),
      ...(old.note ? { note: old.note } : {}),
    }
  } else {
    out = carried(old)
    if (!isCardio(backupId)) {
      const loadChanged = isBw(old) !== isBodyweightEq(backupId) || isAssisted(old) !== isAssisted(backupId)
      if (loadChanged) {
        out.weight = 0
        if (isBodyweightEq(backupId)) out.bodyweight = true
        else delete out.bodyweight
      } else {
        const own = weightFromHistory(S, backupId, { ...out, id: backupId })
        if (own != null) out.weight = own
      }
    }
  }
  out.id = backupId
  return { ...out, ...withBackups([old.id, ...(old.subs || [])], backupId, known) }
}
