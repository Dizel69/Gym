// Four 1-to-5 answers before a workout (lib/daily-form.js). All optional. On a rough day it
// offers to go lighter and never picks that for you.
import { useState } from 'react'
import { t } from '../lib/i18n.js'
import { Button, Segmented } from './ui.jsx'
import Icon from './Icon.jsx'
import { FORM_KEYS, isRough } from '../lib/daily-form.js'

export const FORM_ROWS = {
  sleep: () => ({ icon: 'moon', label: t('Sleep'), lo: t('Barely slept'), hi: t('Slept like a log') }),
  energy: () => ({ icon: 'bolt', label: t('Energy'), lo: t('Running on fumes'), hi: t('Full of beans') }),
  sore: () => ({ icon: 'figureStrength', label: t('Soreness'), lo: t('Nothing aches'), hi: t('Everything aches') }),
  stress: () => ({ icon: 'cloud', label: t('Stress'), lo: t('Calm'), hi: t('Frazzled') }),
}

function Scale({ k, value, onChange }) {
  const row = FORM_ROWS[k]()
  const id = 'dfc-' + k
  return <div className="dfc-row">
    <div className="dfc-q" id={id}><Icon name={row.icon} /><span>{row.label}</span></div>
    <div className="dfc-scale" role="radiogroup" aria-labelledby={id}>
      {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" role="radio" aria-checked={value === n}
        aria-label={n === 1 ? `1, ${row.lo}` : n === 5 ? `5, ${row.hi}` : String(n)}
        className={'dfc-pip' + (value === n ? ' on' : '')} onClick={() => onChange(value === n ? null : n)}>{n}</button>)}
    </div>
    <div className="dfc-ends" aria-hidden="true"><span>{row.lo}</span><span>{row.hi}</span></div>
  </div>
}

/** `lighter` is which ways this session can take. `onDone({ form, lighter })` starts it. `onSkip` starts it as planned. */
export default function DailyCheckin({ lighter = [], onDone, onSkip }) {
  const [f, setF] = useState({ sleep: null, energy: null, sore: null, stress: null })
  const [pick, setPick] = useState('planned')
  const set = k => v => setF(x => ({ ...x, [k]: v }))
  const rough = isRough(f) && lighter.length > 0
  const options = [{ value: 'planned', label: t('As planned') },
    ...(lighter.includes('load') ? [{ value: 'load', label: t('10% lighter') }] : []),
    ...(lighter.includes('sets') ? [{ value: 'sets', label: t('One set fewer') }] : [])]
  const answered = FORM_KEYS.some(k => f[k] != null)
  const start = () => onDone({ form: f, lighter: rough && pick !== 'planned' ? pick : null })
  return <div className="dfc">
    <h3>{t('How are you today?')}</h3>
    <div className="muted small dfc-sub">{t('Tap what fits, skip what does not.')}</div>
    {FORM_KEYS.map(k => <Scale key={k} k={k} value={f[k]} onChange={set(k)} />)}
    {rough && <div className="dfc-light" role="group" aria-label={t('Take it easier today?')}>
      <div className="dfc-light-t">{t('Rough one. Take it easier today?')}</div>
      <Segmented className="seg-inline" options={options} value={pick} onChange={setPick} />
      <div className="small muted">{pick === 'planned'
        ? t('Your call. Nothing changes unless you pick it.')
        : t('Just today. This session sits out of progression, so your next targets stay put.')}</div>
    </div>}
    <Button variant="primary" icon="play" onClick={start}>{answered ? t('Start workout') : t('Start without answering')}</Button>
    <div style={{ height: 8 }} />
    <Button variant="ghost" className="dim" onClick={onSkip}>{t('Skip for today')}</Button>
  </div>
}
