// The workout card on the lock screen and in the notification shade. An ongoing
// notification: weight × reps while a set is up, the countdown and what is next while
// resting. Tapping a button posts an action; the workout screen is the only thing that
// logs a set, and it ignores a second tap on a set that is already logged. Finishing is
// not a button — that still opens the app, because the summary asks what to keep.

const ID = 42
let ready = false

async function plugin() {
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  return LocalNotifications
}

export async function showLiveCard({ title, body, actions }) {
  try {
    const LocalNotifications = await plugin()
    if (!ready) {
      await LocalNotifications.registerActionTypes({
        types: [{
          id: 'workout-live',
          actions: (actions || []).map(a => ({ id: a.id, title: a.title })),
        }],
      })
      await LocalNotifications.addListener('localNotificationActionPerformed', ev => {
        const id = ev?.actionId
        if (id && id !== 'tap' && typeof window !== 'undefined' && window.__opengymLive) window.__opengymLive(id)
      })
      ready = true
    }
    await LocalNotifications.schedule({
      notifications: [{
        id: ID,
        title: title || 'openGym',
        body: body || '',
        ongoing: true,
        autoCancel: false,
        actionTypeId: 'workout-live',
      }],
    })
  } catch { /* a browser with no notification plugin just has the app open */ }
}

export async function clearLiveCard() {
  try {
    const LocalNotifications = await plugin()
    await LocalNotifications.cancel({ notifications: [{ id: ID }] })
  } catch { /* nothing was showing */ }
}
