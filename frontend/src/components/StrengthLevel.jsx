// Strength level per lift (lib/strength-level.js): the block in an exercise's details and the
// Stats card. Hidden when there is no weigh-in or no graded lift with an estimate.
import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale, exerciseNameFor } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { strengthLevel, strengthLevels, levelWeights, liftOf, LEVELS, LEVEL_NAME } from '../lib/strength-level.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'

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
    <div className="small">{t('Estimated max {0}', weightOf(lv, lv.e1rm, S.unit))}</div>
    <NextLine lv={lv} unit={S.unit} />
  </div>
}

const LEVEL_ROWS = 5

function liftName(lv) {
  const ex = EXIDX[lv.id]
  return ex ? exerciseNameFor(ex) : lv.id
}

function StrengthScale({ S }) {
  const rows = strengthLevels(S)
  const bw = rows[0]?.bw
  return <>
    <h3>{t('Strength levels')}</h3>
    {bw > 0 && <div className="small dim" style={{ marginBottom: 12 }}>{t('At {0}, the one-rep max each level starts at.', fmtNum(bw) + ' ' + (S.unit || 'kg'))}</div>}
    {rows.map(lv => <div key={lv.lift} className="slevel-scale">
      <div className="slevel-ex">{liftName(lv)}</div>
      <div className="small" style={{ marginTop: 2 }}>{t('Estimated max {0}', weightOf(lv, lv.e1rm, S.unit))}</div>
      {levelWeights(lv).map(step => <div key={step.name} className={'row between slevel-step' + (step.name === lv.name ? ' on' : '')}>
        <span>{t(LEVEL_NAME[step.name])}</span>
        <b>{weightOf(lv, step.weight, S.unit)}</b>
      </div>)}
    </div>)}
  </>
}

/** Stats: every graded lift, strongest first. The title row opens the full table. */
export function StrengthLevelsCard({ S, onOpen }) {
  const [all, setAll] = useState(false)
  const rows = strengthLevels(S)
  if (!rows.length) return null
  const shown = all ? rows : rows.slice(0, LEVEL_ROWS)
  const openTable = () => useUI.getState().openSheet(() => <StrengthScale S={S} />)
  return <div className="card" data-strength-levels>
    <button type="button" className="slevel-open" onClick={openTable}>
      <h2>{t('Strength levels')}</h2>
      <Icon name="chevronRight" className="chev" />
    </button>
    {shown.map(lv => {
      return <button key={lv.lift} type="button" className="slevel-row" onClick={() => onOpen?.(lv.id)}>
        <span className="slevel-ex">{liftName(lv)}</span>
        <span className="slevel-meta"><b>{t(LEVEL_NAME[lv.name])}</b> · {t('{0} × body weight', fmtRatio(lv.ratio))}</span>
        <div className="small">{t('Estimated max {0}', weightOf(lv, lv.e1rm, S.unit))}</div>
        <NextLine lv={lv} unit={S.unit} />
      </button>
    })}
    {rows.length > LEVEL_ROWS && <Button className="sbar-more" trailingIcon={all ? 'chevronUp' : 'chevronDown'} aria-expanded={all}
      onClick={() => setAll(v => !v)}>{t(all ? 'Show less' : 'Show more')}</Button>}
    <div className="small dim" style={{ marginTop: 8 }}>{t('From published strength standards and your latest weigh-in. Settings → body picks the men’s or women’s table.')}</div>
  </div>
}
