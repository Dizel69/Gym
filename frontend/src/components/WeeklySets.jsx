// Weekly sets against your range (lib/muscle-targets.js). Stats draws every muscle.
// Home, when you switch it on, draws one line: the muscle furthest outside its range.
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtNum, todayISO } from '../lib/format.js'
import { weeklyMuscleSets, furthestOff, targetOf, withTarget, TARGET_MUSCLES, TARGET_MAX } from '../lib/muscle-targets.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import Icon from './Icon.jsx'
import { Button, Stepper } from './ui.jsx'

function clamp(n) {
  return Math.max(0, Math.min(TARGET_MAX, Math.round(Number(n) || 0)))
}

export function WeeklySetsCard() {
  const S = useStore(s => s.S)
  const rows = weeklyMuscleSets(S, todayISO())
  if (!(S.workouts || []).length) return null
  return <div className="card">
    <div className="row between" style={{ marginBottom: 4 }}>
      <h2 style={{ margin: 0 }}>{t('Sets this week')}</h2>
      <Button size="sm" variant="ghost" icon="figureStrength" onClick={muscleTargetsSheet}>{t('Ranges')}</Button>
    </div>
    <div className="small dim" style={{ marginBottom: 8 }}>{t('Working sets against your range. Warm-ups are not counted.')}</div>
    {rows.map(row => <SetRow key={row.slug} row={row} />)}
  </div>
}

function SetRow({ row }) {
  const scale = Math.max(row.hi, row.sets, 1)
  const name = t(row.name)
  return <div className={'wset-row ' + row.status}
    aria-label={t('{0}: {1} of {2}–{3}', name, fmtNum(row.sets), row.lo, row.hi)}>
    <span className="nm">{name}</span>
    <span className="wset-track" aria-hidden="true">
      <i className="fill" style={{ width: Math.min(100, row.sets / scale * 100) + '%' }} />
      <i className="mark lo" style={{ left: (row.lo / scale * 100) + '%' }} />
      {row.sets > row.hi && <i className="mark hi" style={{ left: (row.hi / scale * 100) + '%' }} />}
    </span>
    <span className="wset-num"><b>{fmtNum(row.sets)}</b> / {row.lo}–{row.hi}</span>
  </div>
}

/** Home, only when Settings turns it on: the muscle furthest outside its range. */
export function WeeklySetsHomeLine({ S, onOpen }) {
  const rows = weeklyMuscleSets(S, todayISO())
  if (!rows.some(r => r.sets > 0)) return null
  const off = furthestOff(rows)
  return <button type="button" className="card wsets-home" onClick={onOpen}>
    <Icon name="figureStrength" />
    <span className="grow">{off
      ? t('{0} is furthest from its range: {1} of {2}–{3}', t(off.name), fmtNum(off.sets), off.lo, off.hi)
      : t('Every main muscle is inside its range this week.')}</span>
    <Icon name="chevronRight" className="chev" />
  </button>
}

function TargetsEditor() {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const set = (slug, range) => update(s => {
    const next = withTarget(s.muscleTargets, slug, range)
    if (Object.keys(next).length) s.muscleTargets = next
    else delete s.muscleTargets
  })
  const own = S.muscleTargets && Object.keys(S.muscleTargets).length > 0
  return <>
    <h3>{t('Weekly sets per muscle')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Each muscle has its own range for the week. Below the low end there is still room. Past the high end is more than the range.')}</div>
    {TARGET_MUSCLES.map(slug => {
      const [lo, hi] = targetOf(S, slug)
      return <div key={slug} className="wsets-edit">
        <div className="wsets-edit-n">{t(MUSCLE_NAME[slug])}</div>
        <div className="wsets-edit-r">
          <Stepper value={lo} step={1} decimal={false}
            onChange={v => set(slug, [clamp(v), Math.max(clamp(v), hi)])} />
          <span className="dim" aria-hidden="true">–</span>
          <Stepper value={hi} step={1} decimal={false}
            onChange={v => { const n = clamp(v); set(slug, [Math.min(lo, n), n]) }} />
        </div>
      </div>
    })}
    {own && <><div style={{ height: 12 }} /><Button variant="ghost" icon="reset" onClick={() => update(s => { delete s.muscleTargets })}>{t('Back to the suggested ranges')}</Button></>}
  </>
}

export const muscleTargetsSheet = () => useUI.getState().openSheet(() => <TargetsEditor />)
