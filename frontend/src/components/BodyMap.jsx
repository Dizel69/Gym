import { useEffect, useId, useState } from 'react'
import { MUSCLES, INERT, MUSCLE_NAME, levelsOf } from '../lib/muscles.js'
import { t } from '../lib/i18n.js'
import { Kokoshnik, Pilotka, Pumpkin, SantaHat, StrawHat, Ushanka, Wreath } from './holiday-art.jsx'
import { useHoliday } from './HolidayDecor.jsx'
import { chestDepartmentsFor, CHEST_DEPARTMENTS } from '../lib/chest-regions.js'

// Front and back views of a body, each muscle shaded by how hard it was worked.
//
// The five shade steps are the same ones the activity heatmap uses (.hm-c.l0…l4), so
// "more accent = more training" means one thing everywhere in the app rather than two.
//
// The geometry is ~90 KB and only some screens show a map, so it is fetched on first
// render instead of riding along in the main bundle. Until it lands the component
// renders nothing but keeps its height, so nothing below it jumps on arrival.

let CACHE = null                                  // shared across every mounted map
let PENDING = null

function useBodyPaths() {
  const [paths, setPaths] = useState(CACHE)
  useEffect(() => {
    if (CACHE) return
    let alive = true
    PENDING = PENDING || import('../lib/body-paths.js').then(m => (CACHE = m.default))
    PENDING.then(p => { if (alive) setPaths(p) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return paths
}

// The shin is drawn, but it is the same muscle as the calves: same shade, same tap.
const PAINT_WITH = { tibialis: 'calves' }

function regionsOf(view) {
  const extra = Object.keys(PAINT_WITH).filter(slug => view.p?.[slug]?.length)
  const splitChest = view.p?.chest?.length
  const muscles = splitChest ? MUSCLES.filter(slug => slug !== 'chest') : MUSCLES
  return [...muscles, ...extra]
}

// Where the skull sits in each of the four views: centre x, top of the head, width.
const HEADS = {
  '0 95 727 1280': { cx: 364, top: 100, w: 124 },
  '718 95 727 1280': { cx: 1084, top: 100, w: 120 },
  '0 0 650 1450': { cx: 320, top: 72, w: 146 },
  '823 0 650 1450': { cx: 1142, top: 72, w: 146 },
}

// k is the hat width in head widths, ratio its height over width, dy where its box
// starts above the top of the head, in head widths.
const HATS = {
  santa: { Art: SantaHat, k: 1.42, ratio: 0.9, dy: -0.78 },
  kokoshnik: { Art: Kokoshnik, k: 1.6, ratio: 0.82, dy: -0.8 },
  ushanka: { Art: Ushanka, k: 1.7, ratio: 0.96, dy: -0.76 },
  pilotka: { Art: Pilotka, k: 1.28, ratio: 0.52, dy: -0.3 },
  wreath8: { Art: Wreath, k: 1.36, ratio: 0.6, dy: -0.24, palette: 'mar8' },
  wreathSpring: { Art: Wreath, k: 1.36, ratio: 0.6, dy: -0.24, palette: 'spring' },
  straw: { Art: StrawHat, k: 1.9, ratio: 0.533, dy: -0.55 },
  pumpkin: { Art: Pumpkin, k: 1.5, ratio: 0.833, dy: -0.18, hides: true },
}

const WEAR = {
  newyear: { male: 'santa', female: 'kokoshnik' },
  feb23: { male: 'ushanka', female: 'ushanka' },
  mar8: { female: 'wreath8' },
  spring: { male: 'straw', female: 'wreathSpring' },
  may9: { male: 'pilotka', female: 'pilotka' },
  halloween: { male: 'pumpkin', female: 'pumpkin' },
}

function hatBox(vb, kind) {
  const head = HEADS[vb]
  const hat = HATS[kind]
  if (!head || !hat) return null
  const w = head.w * hat.k
  return { x: head.cx - w / 2, y: head.top + hat.dy * head.w, w, h: w * hat.ratio }
}

// Both views grow by the same amount, or the two figures stop lining up.
function grownViewBox(vb, extra) {
  if (!extra) return vb
  const [x, y, w, h] = vb.split(' ').map(Number)
  return `${x} ${y - extra} ${w} ${h + extra}`
}

function View({ view, levels, onMuscle, selected, wear, extra = 0 }) {
  const uid = useId().replace(/:/g, '')
  const regions = regionsOf(view)
  const activate = (event, muscle) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (event.key === ' ') event.preventDefault()
    onMuscle(muscle)
  }
  const chestPecs = chestDepartmentsFor(view)
  const clips = []
  regions.forEach(slug => (view.c?.[slug] || []).forEach((box, i) => {
    const [x, y, w, h] = box
    clips.push(<clipPath id={`${uid}-${slug}-${i}`} key={slug + i}><rect x={x} y={y} width={w} height={h} /></clipPath>)
  }))
  chestPecs.forEach((pec, pi) => {
    clips.push(<clipPath id={`${uid}-chest-${pi}-shape`} key={`chest-shape-${pi}`}><path d={pec.outline} /></clipPath>)
    CHEST_DEPARTMENTS.forEach(dept => {
      clips.push(<clipPath id={`${uid}-chest-${pi}-${dept}`} key={`chest-${pi}-${dept}`}><path d={pec.clips[dept]} /></clipPath>)
    })
  })
  const hat = wear && HATS[wear]
  const box = hat && hatBox(view.vb, wear)
  const hideHead = !!(box && hat.hides)
  const hideHair = hideHead
  const front = String(view.vb).startsWith('0 ')
  return (
    <svg className="bm-v" viewBox={grownViewBox(view.vb, extra)} role={onMuscle ? 'group' : 'img'}>
      {clips.length ? <defs>{clips}</defs> : null}
      {INERT.map(slug => (view.p[slug] || []).map((d, i) =>
        <path key={slug + i} className={'bm-sil' + ((slug === 'head' && hideHead) || (slug === 'hair' && hideHair) ? ' bm-gone' : '')} d={d} />))}
      {chestPecs.map((pec, pi) => CHEST_DEPARTMENTS.map(dept => {
        const title = t(MUSCLE_NAME[dept])
        return (
          <path
            key={`chest-${pi}-${dept}`}
            data-region={dept}
            className={'bm-m bm-chest-part l' + (levels[dept] || 0) + (selected === dept ? ' sel' : '')}
            d={pec.outline}
            clipPath={`url(#${uid}-chest-${pi}-${dept})`}
            onClick={onMuscle ? () => onMuscle(dept) : undefined}
            onKeyDown={onMuscle ? event => activate(event, dept) : undefined}
            role={onMuscle ? 'button' : undefined}
            tabIndex={onMuscle ? 0 : undefined}
            aria-label={onMuscle ? title : undefined}
            aria-pressed={onMuscle ? selected === dept : undefined}
          >
            <title>{title}</title>
          </path>
        )
      }))}
      {chestPecs.map((pec, pi) => (
        <g key={`chest-art-${pi}`} className="bm-chest-art">
          <path className="bm-chest-outline" d={pec.outline} pointerEvents="none" />
          <path className="bm-chest-seam" d={pec.seams.upper} clipPath={`url(#${uid}-chest-${pi}-shape)`} pointerEvents="none" />
          <path className="bm-chest-seam" d={pec.seams.lower} clipPath={`url(#${uid}-chest-${pi}-shape)`} pointerEvents="none" />
        </g>
      ))}
      {regions.map(slug => (view.p[slug] || []).map((d, i) => {
        const muscle = PAINT_WITH[slug] || slug
        return (
        <path
          key={slug + i}
          data-region={slug}
          className={'bm-m l' + (levels[muscle] || 0) + (selected === muscle ? ' sel' : '')}
          d={d}
          clipPath={view.c?.[slug]?.[i] ? `url(#${uid}-${slug}-${i})` : undefined}
          onClick={onMuscle ? () => onMuscle(muscle) : undefined}
          onKeyDown={onMuscle ? event => activate(event, muscle) : undefined}
          role={onMuscle ? 'button' : undefined}
          tabIndex={onMuscle ? 0 : undefined}
          aria-label={onMuscle ? t(MUSCLE_NAME[muscle]) : undefined}
          aria-pressed={onMuscle ? selected === muscle : undefined}
        >
          <title>{t(MUSCLE_NAME[muscle])}</title>
        </path>
        )
      }))}
      {box && <hat.Art className={'bm-wear w-' + wear} x={box.x} y={box.y} width={box.w} height={box.h}
        back={!front} face={front} palette={hat.palette} />}
    </svg>
  )
}

/**
 * <BodyMap load={{ chest: 12, … }} body="male" />
 * `load` is effective sets per muscle (see lib/muscles.js); shading is relative to
 * the hardest-worked muscle in that same load, so it always reads as a balance. Pass ordered
 * `{ at, level, exclusive? }` `thresholds` for a fixed absolute scale (recovery views use this
 * to keep their semantic bands stable); omitting it preserves the balance behavior.
 */
export default function BodyMap({ load = {}, thresholds, body = 'male', onMuscle, selected, className = '' }) {
  const paths = useBodyPaths()
  const levels = levelsOf(load, thresholds)
  const g = paths && (paths[body] || paths.male)
  const wear = WEAR[useHoliday().theme?.id]?.[body === 'female' ? 'female' : 'male'] || null
  let extra = 0
  if (g && wear) for (const view of [g.front, g.back]) {
    const box = hatBox(view.vb, wear)
    const top = Number(view.vb.split(' ')[1])
    if (box) extra = Math.max(extra, Math.ceil(top - box.y + 6))
  }
  return (
    <div className={'bodymap ' + className}>
      {g ? <>
        <View view={g.front} levels={levels} onMuscle={onMuscle} selected={selected} wear={wear} extra={extra} />
        <View view={g.back} levels={levels} onMuscle={onMuscle} selected={selected} wear={wear} extra={extra} />
      </> : <div className="bm-ph" aria-hidden="true" />}
    </div>
  )
}

export function BodyMapLegend() {
  return <div className="hm-legend" aria-label={`${t('Less')} ${t('More')}`}>
    {t('Less')} <div className="hm-c l0" /><div className="hm-c l1" /><div className="hm-c l2" />
    <div className="hm-c l3" /><div className="hm-c l4" /> {t('More')}
  </div>
}
