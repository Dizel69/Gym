// Strength level per lift (lib/strength-level.js): the block in an exercise's details and the
// Stats card. Hidden when there is no weigh-in or no graded lift with an estimate.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t, dateLocale, exerciseNameFor } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { strengthLevel, strengthLevels, liftOf, LEVELS, LEVEL_NAME } from '../lib/strength-level.js'
import { Button } from './ui.jsx'

const fmtRatio = r => new Intl.NumberFormat(dateLocale(), { maximumFractionDigits: 2 }).format(r)
const weightOf = (lv, w, unit) => {
  const text = fmtNum(w) + ' ' + unit
  return lv.perBell ? t('{0} each', text) : text
}

function LevelBar({ level }) {
  return <div className="slevel-bar" aria-hidden="true">
    {LEVELS.map((name, i) => <span key={name} className={i <= level ? 'on' : ''} />)}
  </div>
}

function NextLine({ lv, unit }) {
  if (!lv.next) return <div className="small muted">{t('Top of the table.')}</div>
  const gap = Math.round((lv.next.weight - lv.e1rm) * 10) / 10
  return <div className="small muted">{t('{0} to reach {1}, at an estimated 1RM of {2}',
    weightOf(lv, gap, unit), t(LEVEL_NAME[lv.next.name]), weightOf(lv, lv.next.weight, unit))}</div>
}

/** Exercise details. Nothing when this movement has no standard, no estimate or no weigh-in. */
export function StrengthLevelBlock({ exId }) {
  const S = useStore(s => s.S)
  if (!liftOf(exId)) return null
  const lv = strengthLevel(S, exId)
  if (!lv) return null
  return <div className="slevel" data-strength-level>
    <h4 className="sec">{t('Strength level')}</h4>
    <div className="row between" style={{ alignItems: 'baseline', gap: 8 }}>
      <div className="slevel-name">{t(LEVEL_NAME[lv.name])}</div>
      <div className="small muted">{t('{0} × body weight', fmtRatio(lv.ratio))}</div>
    </div>
    <LevelBar level={lv.level} />
    <NextLine lv={lv} unit={S.unit} />
  </div>
}

const LEVEL_ROWS = 5

/** Stats: every graded lift, strongest first. */
export function StrengthLevelsCard({ S, onOpen }) {
  const [all, setAll] = useState(false)
  const rows = strengthLevels(S)
  if (!rows.length) return null
  const shown = all ? rows : rows.slice(0, LEVEL_ROWS)
  return <div className="card" data-strength-levels>
    <h2>{t('Strength levels')}</h2>
    {shown.map(lv => {
      const ex = EXIDX[lv.id]
      const name = ex ? exerciseNameFor(ex) : lv.id
      return <button key={lv.lift} type="button" className="slevel-row" onClick={() => onOpen?.(lv.id)}>
        <span className="slevel-ex">{name}</span>
        <span className="slevel-meta"><b>{t(LEVEL_NAME[lv.name])}</b> · {fmtRatio(lv.ratio)}×</span>
        <NextLine lv={lv} unit={S.unit} />
      </button>
    })}
    {rows.length > LEVEL_ROWS && <Button className="sbar-more" trailingIcon={all ? 'chevronUp' : 'chevronDown'} aria-expanded={all}
      onClick={() => setAll(v => !v)}>{t(all ? 'Show less' : 'Show more')}</Button>}
    <div className="small dim" style={{ marginTop: 8 }}>{t('From published strength standards and your latest weigh-in. Settings → body picks the men’s or women’s table.')}</div>
  </div>
}
