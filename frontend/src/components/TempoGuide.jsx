import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'
import { beep, vibrate } from '../lib/sound.js'
import { parseTempo, tempoSteps, stepAt, PHASE_LABEL } from '../lib/tempo.js'
import { Button } from './ui.jsx'

const PHASE_NAME = { down: 'Lower', bottom: 'Pause', up: 'Lift', top: 'Squeeze' }

/** A phase counter for a tempo like 3-1-1-0. A tone and a buzz mark each phase. */
export function TempoGuide({ tempo, reps, sound, onClose }) {
  const steps = tempoSteps(tempo, reps || 8)
  const [on, setOn] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!on) return
    const t0 = Date.now()
    let last = -1
    const id = setInterval(() => {
      const sec = (Date.now() - t0) / 1000
      setElapsed(sec)
      const here = stepAt(steps, sec)
      if (here.done) { beep(sound, 880, 0.2); vibrate([40, 40, 40]); setOn(false); return }
      if (here.index !== last) {
        last = here.index
        beep(sound !== false, here.step.phase === 'down' ? 220 : 520, 0.08)
        vibrate(40)
      }
    }, 100)
    return () => clearInterval(id)
  }, [on, steps, sound])
  const here = stepAt(steps, elapsed)
  const parsed = parseTempo(tempo)
  return <div>
    <h3>{t('Tempo')}</h3>
    <div className="muted small" style={{ marginBottom: 8 }}>{tempo}</div>
    {parsed && <div className="row" style={{ gap: 8, marginBottom: 12 }}>
      {['down', 'bottom', 'up', 'top'].map(ph => (
        <div key={ph} className="card" style={{ flex: 1, padding: 8, textAlign: 'center', outline: here.step?.phase === ph && on ? '2px solid var(--acc)' : 'none' }}>
          <div className="small muted">{t(PHASE_NAME[ph] || PHASE_LABEL[ph] || ph)}</div>
          <b>{parsed[ph]}</b>
        </div>
      ))}
    </div>}
    {on && !here.done && <div style={{ fontSize: 56, fontWeight: 700, textAlign: 'center' }}>{here.left}</div>}
    {on && !here.done && <div className="muted" style={{ textAlign: 'center', marginBottom: 12 }}>{t('Rep {0}', here.step.rep)} · {t(PHASE_NAME[here.step.phase] || here.step.phase)}</div>}
    <div className="row" style={{ gap: 8 }}>
      <Button variant="primary" onClick={() => { setElapsed(0); setOn(v => !v) }}>{on ? t('Pause') : t('Start')}</Button>
      <Button variant="ghost" onClick={onClose}>{t('Close')}</Button>
    </div>
  </div>
}
