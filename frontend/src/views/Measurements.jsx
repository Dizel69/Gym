import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import {
  CUSTOM_MEASUREMENT_UNITS, MEASUREMENT_FIELDS, MEASUREMENT_KEYS, customMeasurementUnits,
  enabledMeasurementFields, fromMeasurementDisplay, latestMeasurement,
  measurementSeries, measurementUnit, measurementUnitLabel,
  measurementValue, normalizeMeasurementsState, saveGuidedMeasurements, stepMeasurement,
  toMeasurementDisplay,
} from '../lib/measurements.js'
import { fmtDate, fmtNum, uid } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import LineChart from '../components/LineChart.jsx'
import Icon from '../components/Icon.jsx'
import { Button, NumberField, Section, Segmented, SelectRow, Switch, TextField } from '../components/ui.jsx'
import { confirmSheet } from '../sheets.jsx'
import { measurementGuideSheet } from '../components/MeasureGuide.jsx'

const update = (fn, ...rest) => useStore.getState().update(s => { fn(s); normalizeMeasurementsState(s) }, ...rest)
const toast = message => useUI.getState().toast(message)
const fieldUnit = (field, profileUnit) => measurementUnitLabel(measurementUnit(profileUnit, field))
const unitOptions = units => units.map(value => ({ value, label: value === 'none' ? t('No unit') : value }))
const withUnit = (value, unit) => unit ? fmtNum(value) + ' ' + unit : fmtNum(value)
const shownValue = (entry, field, profileUnit) => {
  const value = measurementValue(entry, field.key)
  if (value == null) return null
  return toMeasurementDisplay(value, profileUnit, field)
}

function fieldsForDay(S, entry) {
  const fields = [...enabledMeasurementFields(S)]
  if (!entry) return fields
  for (const f of MEASUREMENT_FIELDS) {
    if (entry[f.key] != null && !fields.some(x => x.key === f.key)) fields.push(f)
  }
  for (const o of entry.other || []) {
    if (o.value != null && !fields.some(x => x.key === 'other:' + o.id)) {
      fields.push({ key: 'other:' + o.id, label: o.name, unit: o.unit, custom: true, group: 'Other' })
    }
  }
  return fields
}

function MeasurementAdjust({ field, date, initial, onBack }) {
  const S = useStore(s => s.S)
  const unit = fieldUnit(field, S.unit)
  const [n, setN] = useState(initial)
  const title = field.custom ? field.label : t(field.label)
  const bump = delta => setN(stepMeasurement(n, delta, measurementUnit(S.unit, field)))
  const save = () => {
    const stored = fromMeasurementDisplay(n, S.unit, field)
    if (stored == null) {
      toast(measurementUnit(S.unit, field) === '%'
        ? t('{0} must be between 0 and 100%.', title)
        : t('Enter at least one measurement'))
      return
    }
    update(state => { saveGuidedMeasurements(state, date, { [field.key]: n }) })
    toast(t('Measurements saved'))
    onBack()
  }
  return <>
    <div className="row between" style={{ marginBottom: 6 }}>
      <button className="iconbtn" onClick={onBack} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <h3 style={{ margin: 0, textAlign: 'center' }}>{title}</h3>
      <span style={{ width: 36 }} />
    </div>
    <div className="bwstep">
      <button className="chip" onClick={() => bump(-1)} aria-label="minus 1">−1</button>
      <label className="bw-read">
        <NumberField nullable fit value={n} onChange={setN} aria-label={title}
          onKeyDown={e => { if (e.key === 'Enter' && n != null) save() }} />
        {unit ? <span className="u"> {unit}</span> : null}
      </label>
      <button className="chip" onClick={() => bump(1)} aria-label="plus 1">+1</button>
    </div>
    <div className="chips" style={{ justifyContent: 'center', margin: '8px 0 16px' }}>
      <button className="chip" onClick={() => bump(-0.5)}>−0.5</button>
      <button className="chip" onClick={() => bump(-0.1)}>−0.1</button>
      <button className="chip" onClick={() => bump(0.1)}>+0.1</button>
      <button className="chip" onClick={() => bump(0.5)}>+0.5</button>
    </div>
    <Button variant="primary" onClick={save} disabled={n == null}>{t('Save')}</Button>
  </>
}

function MeasurementDay({ date, close }) {
  const S = useStore(s => s.S)
  const entry = (S.measurements || []).find(e => e.d === date) || null
  const fields = fieldsForDay(S, entry)
  const [editing, setEditing] = useState(null)
  const field = fields.find(f => f.key === editing)
  if (field) {
    return <MeasurementAdjust key={field.key} field={field} date={date} onBack={() => setEditing(null)}
      initial={shownValue(entry, field, S.unit)} />
  }
  return <>
    <h3>{t('Edit measurements')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{fmtDate(date, true)}</div>
    {fields.length ? <div className="card" style={{ padding: 0 }}>
      {fields.map(f => {
        const value = shownValue(entry, f, S.unit)
        const label = f.custom ? f.label : t(f.label)
        return <button key={f.key} className="lrow tap" onClick={() => setEditing(f.key)}>
          <span className="lrow-m"><span className="lrow-t">{label}</span></span>
          <span className="lrow-v" style={{ color: 'var(--label)' }}>{value == null ? '—' : withUnit(value, fieldUnit(f, S.unit))}</span>
          <Icon name="chevronRight" className="lrow-c" />
        </button>
      })}
    </div> : <div className="empty small">{t('Choose at least one measurement first.')}</div>}
    <Button variant="ghost" className="dim" onClick={close}>{t('Done')}</Button>
  </>
}

export function measurementLogSheet(sourceDate) {
  if (!sourceDate) return
  return useUI.getState().openSheet(close => <MeasurementDay date={sourceDate} close={close} />)
}

function ManageMeasurements({ close }) {
  const S = useStore(s => s.S)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState(() => measurementUnit(S.unit))
  const groups = [...new Set(MEASUREMENT_FIELDS.map(f => f.group))]
  const toggleBuiltin = (key, on) => update(state => {
    const set = new Set(state.measurementEnabled || [])
    if (on) set.add(key); else set.delete(key)
    state.measurementEnabled = [...set]
  })
  const toggleCustom = (id, on) => update(state => {
    const item = state.customMeasurements.find(c => c.id === id)
    if (item) item.enabled = on
  })
  const setCustomUnit = (id, value) => update(state => {
    const item = state.customMeasurements.find(c => c.id === id)
    if (item && customMeasurementUnits(item, state.measurements).includes(value)) item.unit = value
  })
  const add = () => {
    const clean = name.trim()
    if (!clean) return
    if ((S.customMeasurements || []).some(c => c.name.toLowerCase() === clean.toLowerCase()) ||
      MEASUREMENT_FIELDS.some(f => f.label.toLowerCase() === clean.toLowerCase())) {
      toast(t('A custom measurement with that name already exists.')); return
    }
    update(state => { state.customMeasurements.push({ id: uid(), name: clean.slice(0, 60), enabled: true, unit }) })
    setName('')
  }
  return <>
    <h3>{t('Choose measurements')}</h3>
    <div className="muted small" style={{ marginBottom: 12 }}>{t('Keep the logging form focused on the measurements you actually track.')}</div>
    {groups.map(group => <Section title={t(group)} key={group}>
      {MEASUREMENT_FIELDS.filter(f => f.group === group).map(field => <div className="lrow" key={field.key}>
        <span className="lrow-m"><span className="lrow-t">{t(field.label)}</span></span>
        <Switch checked={(S.measurementEnabled || []).includes(field.key)} onChange={on => toggleBuiltin(field.key, on)} />
      </div>)}
      {group === 'Other' && (S.customMeasurements || []).map(field => <div key={field.id}>
        <div className="lrow">
          <span className="lrow-m"><span className="lrow-t">{field.name}</span><span className="lrow-s">{t('Custom')}</span></span>
          <Switch checked={field.enabled !== false} onChange={on => toggleCustom(field.id, on)} />
        </div>
        <SelectRow title={t('Measurement unit')} value={measurementUnit(S.unit, field)}
          options={unitOptions(customMeasurementUnits(field, S.measurements))}
          onChange={value => setCustomUnit(field.id, value)} />
      </div>)}
    </Section>)}
    <h4 className="sec">{t('Custom measurement')}</h4>
    <SelectRow title={t('Measurement unit')} value={unit} onChange={setUnit} options={unitOptions(CUSTOM_MEASUREMENT_UNITS)} />
    <div className="row" style={{ gap: 8, marginTop: 8 }}>
      <TextField value={name} maxLength={60} placeholder={t('Custom measurement')} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} />
      <Button icon="plus" onClick={add} disabled={!name.trim()}>{t('Add')}</Button>
    </div>
    <div style={{ height: 14 }} />
    <Button variant="primary" onClick={close}>{t('Done')}</Button>
  </>
}

function manageMeasurementsSheet() {
  return useUI.getState().openSheet(close => <ManageMeasurements close={close} />)
}

function DayCard({ entry, onRemove }) {
  const S = useStore(s => s.S)
  const count = MEASUREMENT_KEYS.filter(k => entry[k] != null).length + (entry.other || []).filter(o => o.value != null).length
  const preview = enabledMeasurementFields(S).map(f => ({ field: f, value: shownValue(entry, f, S.unit) })).filter(x => x.value != null).slice(0, 3)
  const open = () => measurementLogSheet(entry.d)
  return <div className="card">
    <div className="row between">
      <button className="meas-open" onClick={open}>
        <b>{fmtDate(entry.d, true)}</b>
        <div className="small dim" style={{ marginTop: 2 }}>{t(count === 1 ? '{0} measurement' : '{0} measurements', count)}</div>
      </button>
      <div className="row" style={{ gap: 4 }}>
        <button className="iconbtn" onClick={open} aria-label={t('Edit')}><Icon name="pencil" /></button>
        <button className="iconbtn" style={{ color: 'var(--red)' }} onClick={() => onRemove(entry)} aria-label={t('Delete')}><Icon name="trash" /></button>
      </div>
    </div>
    {preview.length > 0 && <button className="meas-open" style={{ marginTop: 8 }} onClick={open}>{preview.map(({ field: f, value }) => <span key={f.key} style={{ marginRight: 12 }}>{f.custom ? f.label : t(f.label)} <b>{withUnit(value, fieldUnit(f, S.unit))}</b></span>)}</button>}
  </div>
}

function MeasurementHistory() {
  const S = useStore(s => s.S)
  const recent = [...(S.measurements || [])].reverse()
  const remove = entry => confirmSheet({
    title: t('Delete measurements?'),
    message: t('Deletes the measurements logged on {0}.', fmtDate(entry.d, true)),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => { update(state => { state.measurements = state.measurements.filter(e => e.d !== entry.d) }); toast(t('Measurements deleted')) },
  })
  return <>
    <h3>{t('Measurement history')}</h3>
    {recent.length ? <div className="list">{recent.map(entry => <DayCard key={entry.d} entry={entry} onRemove={remove} />)}</div>
      : <div className="empty small">{t('No measurements yet')}</div>}
  </>
}

function MeasurementChart({ field, range }) {
  const S = useStore(s => s.S)
  const points = measurementSeries(S, field.key, range)
  const unit = fieldUnit(field, S.unit)
  const all = measurementSeries(S, field.key)
  const latest = all.at(-1)
  const previous = all.at(-2)
  const delta = latest && previous ? Math.round((latest.y - previous.y) * 10) / 10 : null
  const label = field.custom ? field.label : t(field.label)
  return <div className="card">
    <div className="muted small">{label}</div>
    <div className="big" style={{ marginTop: 3 }}>{latest ? <>{fmtNum(latest.y)} <span className="muted" style={{ fontSize: '1rem' }}>{unit}</span></> : '–'}</div>
    {delta != null && delta !== 0 && <div className="small dim" style={{ marginTop: 3 }}>{delta > 0 ? '+' : ''}{withUnit(delta, unit)} {t('since previous')}</div>}
    <div className="chart" style={{ marginTop: 8 }}><LineChart points={points} h={170} unit={unit} color="var(--teal)" dots dayLabels /></div>
  </div>
}

export default function Measurements() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [range, setRange] = useState(90)
  const available = useMemo(() => {
    const out = []
    const push = field => {
      if (out.some(f => f.key === field.key) || !latestMeasurement(S, field.key)) return
      out.push(field)
    }
    for (const field of enabledMeasurementFields(S)) push(field)
    for (const field of MEASUREMENT_FIELDS) push(field)
    for (const custom of S.customMeasurements || []) {
      push({ key: 'other:' + custom.id, label: custom.name, unit: custom.unit, custom: true, group: 'Other' })
    }
    return out
  }, [S])
  const recent = [...(S.measurements || [])].reverse()
  const remove = entry => confirmSheet({
    title: t('Delete measurements?'),
    message: t('Deletes the measurements logged on {0}.', fmtDate(entry.d, true)),
    confirmText: t('Delete'), danger: true,
    onConfirm: () => { update(state => { state.measurements = state.measurements.filter(e => e.d !== entry.d) }); toast(t('Measurements deleted')) },
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/stats')} aria-label={t('Stats')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 12 }}><h1>{t('Body measurements')}</h1><div className="sub">{t('Circumference & composition')}</div></div>
      <button className="iconbtn" onClick={manageMeasurementsSheet} aria-label={t('Choose measurements')}><Icon name="gear" /></button>
    </div>

    <button className="meas-hist" onClick={() => useUI.getState().openSheet(() => <MeasurementHistory />)}>
      <h4 className="sec">{t('Measurement history')}</h4>
      <Icon name="chevronRight" className="chev" />
    </button>
    {recent.length ? <div className="list">{recent.slice(0, 2).map(entry => <DayCard key={entry.d} entry={entry} onRemove={remove} />)}</div>
      : <div className="empty small">{t('No measurements yet')}</div>}

    {available.length > 0 && <>
      <div className="row between" style={{ margin: '6px 0 10px', gap: 8 }}>
        <Segmented className="seg-range" value={range} onChange={setRange}
          options={[{ value: 30, label: '1M' }, { value: 90, label: '3M' }, { value: 365, label: '1Y' }, { value: 0, label: t('All') }]} />
        <Button size="sm" icon="plus" onClick={() => measurementGuideSheet()}>{t('Log')}</Button>
      </div>
      {available.map(field => <MeasurementChart key={field.key} field={field} range={range} />)}
    </>}

    {!available.length && <div className="card">
      <div className="muted small">{t('Choose the measurements you want to track, then log your first check-in.')}</div>
      <div style={{ height: 10 }} /><Button onClick={manageMeasurementsSheet}>{t('Choose measurements')}</Button>
    </div>}
  </div>
}
