import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { uid, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { planToolsSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable } from '../lib/use-sheet-keyboard.js'
import { glyphOf, DEFAULT_GLYPH } from '../lib/glyphs.js'
import { DEMO } from '../lib/demo.js'
import { MOBILE } from '../lib/mobile.js'
import { coachAvailable } from '../lib/coach.js'

export default function Plan() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const update = useStore(s => s.update)
  const config = useStore(s => s.config)
  const coachMode = useStore(s => s.coachLocal?.mode)
  const user = useStore(s => s.user)
  const showCoach = coachAvailable(config, user, { demo: DEMO, mobile: MOBILE, coachMode })

  const moveRoutine = (i, delta) => update(s => {
    const to = i + delta
    if (to < 0 || to >= s.routines.length) return
    const [moved] = s.routines.splice(i, 1)
    s.routines.splice(to, 0, moved)
  })

  const addRoutine = () => {
    const r = { id: uid(), name: t('New routine'), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) })
    nav('/plan/r/' + r.id)
  }

  return <>
    <div className="hdr">
      <div><h1>{t('Complexes')}</h1><div className="sub">{t('Saved workouts you pick on the day you train.')}</div></div>
      <button className="iconbtn" onClick={planToolsSheet} aria-label={t('Share your plan')} title={t('Share your plan')}><Icon name="upload" /></button>
    </div>
    {showCoach && <button className="coach-cta" onClick={() => nav('/coach')}>
      <span className="coach-cta-av"><Icon name="sparkles" /></span>
      <span className="coach-cta-t">
        <b>{t('Coach')}</b>
        <span>{t('Plan design and reviews, from your own training')}</span>
      </span>
      <Icon name="chevronRight" className="coach-cta-chev" />
    </button>}
    <div className="row between" style={{ marginTop: 8, marginBottom: 10 }}>
      <h4 className="sec" style={{ margin: 0 }}>{t('Complexes')}</h4>
      <Button size="sm" variant="tinted" icon="plus" onClick={addRoutine}>{t('New')}</Button>
    </div>
    {S.routines.length ? <div className="list">{S.routines.map((r, i) => <div key={r.id} className="item" {...tappable(() => nav('/plan/r/' + r.id))}>
      <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
      <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount(r.ex.length)}</div></div>
      {S.routines.length > 1 && <div style={{ display: 'flex', gap: 2, flex: 'none' }}>
        <button className="iconbtn" aria-label={t('Move up')} title={t('Move up')} disabled={i === 0}
          style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }}
          onClick={ev => { ev.stopPropagation(); moveRoutine(i, -1) }}><Icon name="chevronUp" /></button>
        <button className="iconbtn" aria-label={t('Move down')} title={t('Move down')} disabled={i === S.routines.length - 1}
          style={{ width: 28, height: 24, borderRadius: 7, fontSize: 12 }}
          onClick={ev => { ev.stopPropagation(); moveRoutine(i, 1) }}><Icon name="chevronDown" /></button>
      </div>}
      <Icon name="chevronRight" className="chev" /></div>)}</div> : <>
      <div className="empty"><div className="ico"><Icon name="clipboard" /></div>{t('No complexes yet.')}</div>
    </>}
  </>
}
