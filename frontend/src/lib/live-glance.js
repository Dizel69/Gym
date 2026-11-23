import { MOBILE } from './mobile.js'

// The workout card on the lock screen and in the notification shade. The words come from
// live-card.js: weight × reps, a cardio pace, or a carry's metres and load, plus a pulse
// when a strap is sending one. The Android shell posts it and, on Android 16, asks the
// system to promote it. An older shell falls back to a plain ongoing notification.
// Tapping a button posts an action; the workout screen is the only thing that logs a set,
// and it ignores a second tap on a set that is already logged. Finishing is not a button.

const ID = 42
let ready = false
let nativeOn = false

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

function onAction(id) {
  if (id && id !== 'tap' && typeof window !== 'undefined' && window.__opengymLive) window.__opengymLive(id)
}

// The shell's own notification. Android 16 can promote it; the local-notification fallback cannot.
async function nativeShow(card, title, body, actions) {
  const { registerPlugin } = await import('@capacitor/core')
  const LiveCard = registerPlugin('LiveCard')
  if (!nativeOn) {
    await LiveCard.addListener('action', ev => onAction(ev?.id))
    nativeOn = true
  }
  await LiveCard.show({
    title,
    body,
    chip: card?.chip || '',
    done: Number(card?.done) || 0,
    total: Number(card?.total) || 0,
    actions: JSON.stringify(actions || []),
  })
}

export async function showLiveCard(card) {
  if (!MOBILE) return
  const title = card?.title || 'openGym'
  const body = card?.body || ''
  const actions = card?.actions || []
  try {
    await nativeShow(card, title, body, actions)
    return
  } catch { /* an older shell still has the local notification below */ }
  try {
    const LocalNotifications = await plugin()
    if (!ready) {
      await LocalNotifications.registerActionTypes({
        types: [{
          id: 'workout-live',
          actions: actions.map(a => ({ id: a.id, title: a.title })),
        }],
      })
      await LocalNotifications.addListener('localNotificationActionPerformed', ev => onAction(ev?.actionId))
      ready = true
    }
    await LocalNotifications.schedule({
      notifications: [{
        id: ID,
        title,
        body,
        ongoing: true,
        autoCancel: false,
        actionTypeId: 'workout-live',
      }],
    })
  } catch { /* a browser with no notification plugin just has the app open */ }
}

export async function clearLiveCard() {
  if (!MOBILE) return
  try {
    const { registerPlugin } = await import('@capacitor/core')
    await registerPlugin('LiveCard').clear()
  } catch { /* the local notification is the other copy */ }
  try {
    const LocalNotifications = await plugin()
    await LocalNotifications.cancel({ notifications: [{ id: ID }] })
  } catch { /* nothing was showing */ }
}
