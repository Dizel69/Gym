import { t, dateLocale } from '../lib/i18n.js'
import { fmtNum, fmtVol } from '../lib/format.js'
import { monthGoals } from '../lib/month-goals.js'

const LB_TO_KG = 0.45359237
const LABEL = { workouts: 'Workouts', volume: 'Volume', records: 'PRs' }

function kgOf(n, unit) {
  return unit === 'lb' ? n * LB_TO_KG : n
}

function tonnes(n, unit) {
  const value = Math.round(kgOf(n, unit) / 100) / 10
  return t('{0} t', value.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }))
}

function reading(goal, unit) {
  if (goal.id !== 'volume') return fmtNum(goal.value) + ' / ' + fmtNum(goal.target)
  const big = kgOf(goal.value, unit) >= 1000 || kgOf(goal.target, unit) >= 1000
  const one = n => big ? tonnes(n, unit) : fmtVol(n, unit)
  return one(goal.value) + ' / ' + one(goal.target)
}

export default function MonthGoals({ S }) {
  const game = monthGoals(S)
  if (!game) return null
  const unit = S.unit === 'lb' ? 'lb' : 'kg'
  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>{t('Monthly goals')}</h2>
      <div className="dim small" style={{ marginTop: 2 }}>{t('A game from your past months. Unfinished goals end with the month.')}</div>
      {game.goals.map(goal => (
        <div key={goal.id} className="goal-row">
          <div className="row between">
            <span>{t(LABEL[goal.id])}</span>
            <span className="dim small">{reading(goal, unit)}</span>
          </div>
          <div className="goal-bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={goal.value}>
            <i className={goal.value >= goal.target ? 'done' : ''} style={{ width: Math.min(100, goal.target ? (goal.value / goal.target) * 100 : 0) + '%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
