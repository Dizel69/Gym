import { useMemo } from 'react'
import { fatigueOf, strengthOf, LB_TO_KG } from '../lib/recovery.js'
import { recommendToday, REGIONS } from '../lib/recommend.js'
import { t } from '../lib/i18n.js'
import { startFlow } from '../sheets.jsx'
import { Button } from './ui.jsx'

function bodyweightKgOf(S) {
  const entries = S.bodyweight || []
  if (!entries.length) return null
  const last = entries.slice().sort((a, b) => String(a.d).localeCompare(String(b.d))).at(-1)
  if (!last || !(last.w > 0)) return null
  return S.unit === 'lb' ? last.w * LB_TO_KG : last.w
}

export default function TodaySuggestion({ S, now = Date.now() }) {
  const advice = useMemo(() => {
    if (S.active || !(S.routines || []).some(routine => (routine.ex || []).length)) return null
    const opts = { bodyweightKg: bodyweightKgOf(S), unit: S.unit }
    return recommendToday({
      routines: S.routines,
      fatigue: fatigueOf(S.workouts, now, opts),
      strength: strengthOf(S.workouts, now, opts),
    })
  }, [S, now])
  if (!advice) return null
  const avoid = advice.avoid.map(id => t(REGIONS.find(region => region.id === id).name)).join(', ')
  const text = advice.avoid.length && advice.routineName
    ? t('Rest today: {0}. {1} is the better complex today.', avoid, advice.routineName)
    : advice.blocked
      ? t('Rest today: {0}. Every saved complex still trains them.', avoid)
      : advice.routineName
        ? t('Nothing is worn out. {0} is a good pick today.', advice.routineName)
        : null
  if (!text) return null
  return <div style={{ marginTop: 10 }}>
    <div className="muted small">{text}</div>
    {advice.routineId && <div style={{ marginTop: 8 }}>
      <Button size="sm" variant="primary" onClick={() => startFlow([advice.routineId])}>{t('Start {0}', advice.routineName)}</Button>
    </div>}
  </div>
}
