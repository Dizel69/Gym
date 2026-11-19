import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { beep, vibrate } from '../lib/sound.js'
import { exOr } from '../lib/exercises.js'
import { modeOf } from '../lib/history.js'
import {
  startRun, tickRun, doneStep, skipStep, pauseRun, resumeRun, stopRun,
  leftOf, runStep, logStation, runResult, compareResult, previousResult,
  stationSuggestions, nextProgram, circuitClock,
} from '../lib/circuit.js'
import { Button } from './ui.jsx'

/**
 * Full-screen clock for a circuit, AMRAP, EMOM, intervals or a run/walk.
 * Each station is written as an ordinary set, so the log, records and progression see it.
 */
export function CircuitPlayer({ unit, onClose }) {
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const A = S.active
  const cfg = (A?.entries || []).map(e => e.target?.sgCircuit).find(Boolean)
  const stations = (unit || []).map(idx => {
    const e = A.entries[idx]
    const row = (e.sets || []).find(s => !s.done) || e.sets?.[0] || {}
    const target = e.target || {}
    return {
      idx, id: e.id, mode: modeOf({ ...target, id: e.id }),
      reps: Math.round(Number(row.r ?? target.reps) || 0),
      w: Number(row.w) || 0,
      sec: Math.round(Number(row.sec ?? target.sec) || 0),
      base: (e.sets || []).filter(s => s.done && !s.warmup && s.phase !== 'warmup').length,
    }
  })
  const [run, setRun] = useState(() => startRun({ wid: A?.id, sg: A.entries[unit[0]]?.target?.sg || A.entries[unit[0]]?.sg, cfg, stations, roundRest: A.entries[unit[0]]?.target?.sgRest || 0 }))
  const [now, setNow] = useState(Date.now())
  const [result, setResult] = useState(null)
  const [compare, setCompare] = useState(null)
  const [ideas, setIdeas] = useState([])
  const ended = useRef(false)

  const apply = (next, events) => {
    setRun(next.run)
    for (const ev of events || []) {
      if (ev.type === 'step' && (ev.step?.k === 'work' || ev.step?.k === 'rest')) { beep(S.sound !== false, 660, 0.12); vibrate(30) }
      if (ev.type === 'work' && !ev.skipped) {
        const station = next.run.stations[ev.m]
        update(s => { logStation(s.active.entries, station, ev.r, { reps: ev.reps, w: ev.w, sec: ev.sec, at: ev.to }) })
      }
      if (ev.type === 'end') finish(next.run)
    }
  }
  const finish = (done) => {
    if (ended.current || !done) return
    ended.current = true
    const res = runResult(done)
    const last = previousResult(S.workouts, res)
    setResult(res)
    setCompare(compareResult(res, last))
    setIdeas(stationSuggestions(done, useStore.getState().S.active.entries))
    update(s => {
      if (!s.active) return
      s.active.circuits = [...(s.active.circuits || []), res]
      const prog = nextProgram(done.cfg, res)
      if (prog && JSON.stringify(prog) !== JSON.stringify(done.cfg)) {
        s.active.circuitAdvances = [...(s.active.circuitAdvances || []), { sg: done.sg, from: done.cfg, to: prog, rid: s.active.routineIds?.[0] }]
      }
    })
  }

  useEffect(() => {
    const id = setInterval(() => {
      const tnow = Date.now()
      setNow(tnow)
      setRun(prev => {
        if (!prev || prev.ended || prev.paused != null) return prev
        const next = tickRun(prev, tnow)
        if (next.events.length) {
          for (const ev of next.events) {
            if (ev.type === 'step') { beep(S.sound !== false, 660, 0.1); vibrate(20) }
            if (ev.type === 'work' && !ev.skipped) {
              const station = next.run.stations[ev.m]
              update(s => { if (s.active) logStation(s.active.entries, station, ev.r, { reps: ev.reps, w: ev.w, sec: ev.sec, at: ev.to }) })
            }
            if (ev.type === 'end') finish(next.run)
          }
        }
        const left = leftOf(next.run, tnow)
        if (left != null && left <= 3 && left > 0) beep(S.sound !== false, 880, 0.06)
        return next.run
      })
    }, 250)
    return () => clearInterval(id)
  }, [])

  const step = runStep(run)
  const left = leftOf(run, now)
  const clock = circuitClock(run, now)
  const name = step ? exerciseNameFor(exOr(run.stations[step.m]?.id)) : ''
  const next = run && stepAtSafe(run)

  if (result) {
    const line = !compare ? ''
      : compare.kind === 'round' && compare.delta < 0 ? t('Round {0} was {1}s faster today', compare.round, Math.abs(compare.delta))
      : compare.kind === 'round' && compare.delta > 0 ? t('Round {0} was {1}s slower today', compare.round, compare.delta)
      : compare.kind === 'rounds' ? t('{0} rounds more than last time', compare.delta)
      : compare.kind === 'reps' ? t('{0} reps more than last time', compare.delta) : ''
    return <div className="narrow">
      <h2>{t('Done')}</h2>
      <p>{t('{0} rounds', result.rounds)}{result.extra ? ' + ' + result.extra : ''}</p>
      {line && <p>{line}</p>}
      {ideas.map(idea => <Button key={idea.idx + idea.field} onClick={() => update(s => {
        const e = s.active?.entries?.[idea.idx]
        if (e?.target) e.target[idea.field] = idea.to
        const rid = s.active?.routineIds?.[0]
        const routine = s.routines.find(r => r.id === rid)
        const slot = routine?.ex?.find(x => x.id === idea.id)
        if (slot) slot[idea.field] = idea.to
        setIdeas(list => list.filter(x => x !== idea))
      })}>{idea.field === 'reps' ? t('Add a rep next time') : t('Add 5 seconds next time')}</Button>)}
      <Button variant="primary" onClick={onClose}>{t('Close')}</Button>
    </div>
  }

  return <div className="narrow" style={{ textAlign: 'center' }}>
    <div className="muted">{step?.k === 'prep' ? t('Get ready') : step?.k === 'rest' ? t('Rest') : name}</div>
    <div style={{ fontSize: 72, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{left == null ? '—' : left}</div>
    {left != null && left <= 3 && left > 0 && <div style={{ fontSize: 28 }}>{left}</div>}
    {clock?.kind === 'rest' && <div className="muted">{t('Rest')}</div>}
    {next && <div className="muted" style={{ marginBottom: 16 }}>{t('Up next')}: {next}</div>}
    <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
      <Button onClick={() => apply(doneStep(run))}>{t('Done')}</Button>
      <Button variant="ghost" onClick={() => apply(skipStep(run))}>{t('Skip')}</Button>
      <Button variant="ghost" onClick={() => setRun(run.paused != null ? resumeRun(run) : pauseRun(run))}>{run.paused != null ? t('Resume') : t('Pause')}</Button>
      <Button variant="ghost" onClick={() => { const stopped = stopRun(run); setRun(stopped.run); finish(stopped.run) }}>{t('Stop')}</Button>
    </div>
  </div>
}

function stepAtSafe(run) {
  const s = runStep({ ...run, i: run.i + 1 })
  if (!s) return ''
  if (s.k === 'rest') return t('Rest')
  return ''
}
