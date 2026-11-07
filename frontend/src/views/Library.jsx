import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { CATALOGUE, BODYPARTS, allExercises, categoriesOf, equipmentOf, searchExercises } from '../lib/exercises.js'
import { MUSCLE_NAME } from '../lib/muscles.js'
import { activeProfile, exAvailable } from '../lib/equipment.js'
import { bestWeightFor } from '../lib/history.js'
import { fmtNum } from '../lib/format.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import { Thumb } from '../components/Media.jsx'
import { exerciseDetailSheet, addToRoutineSheet, customExSheet } from '../sheets.jsx'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { tappable, useRevealActiveChip } from '../lib/use-sheet-keyboard.js'
import { isFav, sortFavouritesFirst } from '../lib/favourites.js'

export default function Library() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const [q, setQ] = useState('')
  const [bp, setBp] = useState('')
  const [cat, setCat] = useState('')
  const [eq, setEq] = useState('')
  const [showAll, setShowAll] = useState(false)   // ignore the active equipment profile for this session
  const [shown, setShown] = useState(40)
  const catStrip = useRef(null), bpStrip = useRef(null), eqStrip = useRef(null)
  const profile = activeProfile(S)
  const searched = searchExercises(allExercises(S), q)
  const available = (profile && !showAll) ? searched.filter(e => exAvailable(S, e)) : searched
  const catOpts = categoriesOf(available)
  // A type the search has narrowed away is ignored for this view, and the choice stays
  // so clearing the search brings it back.
  const catOn = catOpts.includes(cat) ? cat : ''
  const typed = catOn ? available.filter(e => e.cat === catOn) : available
  const inPart = bp ? typed.filter(e => e.bp === bp) : typed
  const eqOpts = equipmentOf(inPart)
  const eqOn = eqOpts.includes(eq) ? eq : ''
  // Favourites float to the top of whatever the filters left (issue #6), the rest keeps its order.
  const f = sortFavouritesFirst(eqOn ? inPart.filter(e => e.eq === eqOn) : inPart, S)
  useRevealActiveChip(catStrip, catOn)
  useRevealActiveChip(bpStrip, bp)
  useRevealActiveChip(eqStrip, eqOn)

  return <>
    <div className="hdr"><div><h1>{t('Exercises')}</h1><div className="sub">{t('{0} exercises with animations', CATALOGUE.length)}</div></div>
      <Button size="sm" variant="tinted" icon="target" onClick={() => nav('/muscles')}>{t('By muscle')}</Button>
    </div>
    <div className="search" style={{ marginBottom: 10 }}><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      <input className="input" placeholder={t('Search…')} value={q} onChange={e => { setQ(e.target.value); setShown(40) }} /></div>
    {profile && <div className="small dim row" style={{ margin: '-4px 2px 10px', gap: 6, alignItems: 'center' }}>
      <Icon name="dumbbell" style={{ fontSize: 13 }} />
      {showAll ? t('Showing all equipment') : t('Showing what you have in "{0}"', profile.name)}
      <button className="chip nocap" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setShowAll(v => !v)}>
        {showAll ? t('Filter by "{0}"', profile.name) : t('Show all equipment')}
      </button>
    </div>}
    {/* Changing body part keeps the equipment filter (issue #71): the eqOn fallback above drops
        it only for the current view if the new body part has nothing under it, without forgetting
        the choice. "All" clears it, since it spans every body part. */}
    {catOpts.length > 1 && <div className="chips" ref={catStrip} style={{ marginBottom: 8 }}>
      <button className={'chip nocap' + (!catOn ? ' on' : '')} onClick={() => { setCat(''); setShown(40) }}>{t('Any type')}</button>
      {catOpts.map(c => <button key={c} className={'chip' + (catOn === c ? ' on' : '')} onClick={() => { setCat(c); setShown(40) }}>{t(c)}</button>)}
    </div>}
    <div className="chips" ref={bpStrip} style={{ marginBottom: eqOpts.length > 1 ? 8 : 12 }}>
      <button className={'chip nocap' + (!bp ? ' on' : '')} onClick={() => { setBp(''); setEq(''); setShown(40) }}>{t('All')}</button>
      {BODYPARTS.map(b => <button key={b} className={'chip' + (bp === b ? ' on' : '')} onClick={() => { setBp(b); setShown(40) }}>{t(b)}</button>)}
    </div>
    {eqOpts.length > 1 && <div className="chips" ref={eqStrip} style={{ marginBottom: 12 }}>
      <button className={'chip nocap' + (!eqOn ? ' on' : '')} onClick={() => { setEq(''); setShown(40) }}>{t('Any equipment')}</button>
      {eqOpts.map(x => <button key={x} className={'chip' + (eqOn === x ? ' on' : '')} onClick={() => { setEq(x); setShown(40) }}>{t(x)}</button>)}
    </div>}
    <div className="list">
      <div className="item" {...tappable(() => customExSheet(null, ex => exerciseDetailSheet(ex), q.trim()))}>
        <div className="thumb thumb-x"><Icon name="sparkles" /></div>
        <div className="grow"><div className="tt">{t('Create your own exercise')}</div><div className="ss">{t('name + body part, no animation')}</div></div><Icon name="plus" className="chev" />
      </div>
      {f.slice(0, shown).map(e => {
        const best = bestWeightFor(S, e.id)
        return <div key={e.id} className="item" {...tappable(() => exerciseDetailSheet(e))}>
          <Thumb ex={e} />
          <div className="grow"><div className="tt capitalize">{isFav(S, e.id) && <Icon name="starFill" className="fav-star" />}{exerciseNameFor(e)}</div><div className="ss capitalize">{t(MUSCLE_NAME[e.tg] || e.tg || e.bp)} · {t(e.eq)}</div></div>
          {best > 0 && <span className="tag acc">{fmtNum(best)}</span>}
          <Button size="sm" variant="tinted" icon="plus" onClick={ev => { ev.stopPropagation(); addToRoutineSheet(e) }}>{t('Plan')}</Button>
        </div>
      })}
      {f.length === 0 && <div className="empty"><div className="ico"><Icon name="magnifier" /></div>{t('No match')}</div>}
    </div>
    {f.length > shown && <><div style={{ height: 10 }} /><Button onClick={() => setShown(s => s + 40)}>{t('Show more')}</Button></>}
  </>
}

