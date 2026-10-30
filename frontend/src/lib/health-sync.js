/* Phone-only. The website never talks to Health Connect; it shows whatever the
 * phone has already written into the synced profile. */
import { registerPlugin } from '@capacitor/core'
import { MOBILE, onAppActive } from './mobile.js'
import { healthImportOn, mergeHealthDays } from './health.js'
import { useStore } from '../store/useStore.js'

const Health = MOBILE ? registerPlugin('Health') : null
let started = false

export async function healthStatus() {
  if (!Health) return { available: false, granted: false, full: false }
  try {
    const s = await Health.status()
    return { available: !!s?.available, granted: !!s?.granted, full: !!s?.full }
  } catch {
    return { available: false, granted: false, full: false }
  }
}

export async function requestHealthAccess() {
  if (!Health) return { available: false, granted: false, full: false }
  try {
    const s = await Health.request()
    return { available: !!s?.available, granted: !!s?.granted, full: !!s?.full }
  } catch {
    return { available: false, granted: false, full: false }
  }
}

/** Pull today's window into the profile. No-op when the read fails, so a
 *  denied or missing Health Connect never wipes numbers already stored. */
export async function syncHealthIntoStore() {
  if (!Health) return null
  if (!healthImportOn(useStore.getState().S)) return null
  const status = await healthStatus()
  if (!status.granted) return status
  let days = null
  try {
    const res = await Health.read()
    days = Array.isArray(res?.days) ? res.days : null
  } catch { /* leave the stored days alone */ }
  if (!days) return status
  const { S, update } = useStore.getState()
  const next = mergeHealthDays(S.healthDays, days)
  if (JSON.stringify(next) !== JSON.stringify(S.healthDays || [])) {
    update(s => { s.healthDays = next })
  }
  return status
}

/** First open, and every return to the app. Safe to call twice (StrictMode). */
export function startHealthSync() {
  if (!MOBILE || started) return
  started = true
  syncHealthIntoStore()
  onAppActive(() => { syncHealthIntoStore() })
}
