import { useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  enabledMeasurementFields, measureHint, measurementUnit, measurementUnitLabel,
  measurementValue, saveGuidedMeasurements, toMeasurementDisplay,
} from '../lib/measurements.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { Button, NumberField } from './ui.jsx'
import Icon from './Icon.jsx'
import MeasureFigure from './MeasureFigure.jsx'

function storedDisplay(entry, field, unit) {
  if (!entry || !field) return null
  const raw = measurementValue(entry, field.key)
  return raw == null ? null : toMeasurementDisplay(raw, unit, field)
}

function MeasureGuide({ close }) {
  const S = useStore(s => s.S)
  const today = (S.measurements || []).find(e => e.d === todayISO()) || null
  const [steps] = useState(() => enabledMeasurementFields(useStore.getState().S))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState({})
  const step = steps[i]
  const last = i === steps.length - 1
  const unit = step ? measurementUnitLabel(measurementUnit(S.unit, step)) : ''
  const [n, setN] = useState(() => storedDisplay(today, steps[0], S.unit))

  if (!step) return <>
    <h3>{t('Body measurements')}</h3>
    <p className="muted small">{t('Choose at least one measurement first.')}</p>
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
  </>

  const show = (index, nextPicked) => {
    const field = steps[index]
    setI(index)
    setN(Object.prototype.hasOwnProperty.call(nextPicked, field.key)
      ? (nextPicked[field.key] == null ? null : nextPicked[field.key])
      : storedDisplay(today, field, S.unit))
  }

  const remember = keep => ({ ...picked, [step.key]: keep && n != null ? n : null })

  const finish = next => {
    const values = {}
    for (const field of steps) if (next[field.key] != null) values[field.key] = next[field.key]
    if (Object.keys(values).length) {
      useStore.getState().update(s => { saveGuidedMeasurements(s, todayISO(), values) })
      useUI.getState().toast(t('Measurements saved'))
    }
    close()
  }

  const go = keep => {
    const kept = remember(keep)
    setPicked(kept)
    if (last) finish(kept)
    else show(i + 1, kept)
  }

  const title = step.custom ? step.label : t(step.label)
  return <>
    <div className="row between" style={{ marginBottom: 6 }}>
      {i > 0
        ? <button className="iconbtn" onClick={() => show(i - 1, picked)} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
        : <span style={{ width: 36 }} />}
      <span className="dim small">{t('{0} of {1}', i + 1, steps.length)}</span>
      <span style={{ width: 36 }} />
    </div>
    <h3 style={{ textAlign: 'center' }}>{title}</h3>
    <MeasureFigure part={step.key} />
    <p className="muted small" style={{ margin: '12px 2px 4px', lineHeight: 1.4 }}>{t(measureHint(step.key))}</p>
    <div className="bwin measure-in">
      <NumberField nullable autoFocus value={n} onChange={setN} aria-label={title}
        onKeyDown={e => { if (e.key === 'Enter' && n != null) go(true) }} />
      <span>{unit}</span>
    </div>
    <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <div style={{ flex: 1 }}><Button onClick={() => go(false)}>{t('Skip')}</Button></div>
      <div style={{ flex: 1 }}><Button variant="primary" onClick={() => go(true)} disabled={!last && n == null}>{last ? t('Done') : t('Next')}</Button></div>
    </div>
  </>
}

export function measurementGuideSheet() {
  return useUI.getState().openSheet(close => <MeasureGuide close={close} />)
}
