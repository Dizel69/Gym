// The year's stories. Home shows the card from December through January. Stats
// opens any year, on the phone and on the website. The picture is the story
// on screen, shared the same way as a workout card.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale, exerciseNameFor, getLang } from '../lib/i18n.js'
import { fmtNum, fmtVol } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { yearReview, reviewYears, homeReviewYear } from '../lib/year-review.js'
import { shareWorkoutCard } from '../lib/workout-card.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'

const FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function weeksText(n) {
  if (getLang() !== 'ru') return t(n === 1 ? '{0} week' : '{0} weeks', n)
  const n10 = n % 10
  const n100 = n % 100
  if (n10 === 1 && n100 !== 11) return n + ' неделя'
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return n + ' недели'
  return n + ' недель'
}

function hoursText(hours) {
  if (hours == null) return t('No times in the log')
  if (hours < 1) return t('{0} min', Math.max(1, Math.round(hours * 60)))
  return t('{0} h', hours.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }))
}

function liftedText(review) {
  if (review.tonnes >= 1) return t('{0} t', review.tonnes.toLocaleString(dateLocale(), { maximumFractionDigits: 1 }))
  return fmtVol(review.volume, review.unit)
}

function favoriteName(favorite) {
  if (!favorite) return t('No exercises yet.')
  const ex = EXIDX[favorite.id]
  return ex ? exerciseNameFor(ex) : (favorite.name || favorite.id)
}

export function yearSlides(review) {
  if (!review) return []
  return [
    { key: 'cover', kicker: String(review.year), value: t('Your year'), note: t('From your own log.') },
    { key: 'workouts', kicker: t('Workouts'), value: fmtNum(review.workouts), note: t('Logged in {0}.', review.year) },
    { key: 'hours', kicker: t('Time'), value: hoursText(review.hours), note: review.hours == null ? t('Imported history has no clock.') : t('From the sessions that recorded a start and a finish.') },
    { key: 'lifted', kicker: t('Lifted'), value: liftedText(review), note: t('Working volume. Warm-ups are left out.') },
    { key: 'streak', kicker: t('Streak'), value: weeksText(review.streak), note: t('The longest run of weeks with a workout.') },
    { key: 'favorite', kicker: t('Favourite exercise'), value: favoriteName(review.favorite), note: review.favorite ? t('{0} working sets', review.favorite.sets) : t('No exercises yet.') },
  ]
}

function paintSlide(canvas, slide) {
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#121418'
  ctx.fillRect(0, 0, 1080, 1920)
  ctx.fillStyle = '#30d158'
  ctx.fillRect(0, 0, 1080, 14)
  ctx.font = `700 28px ${FONT}`
  ctx.fillStyle = '#30d158'
  ctx.fillText('OPENGYM', 88, 220)
  ctx.font = `600 32px ${FONT}`
  ctx.fillText(String(slide.kicker).toUpperCase(), 88, 320)
  ctx.fillStyle = '#f4f6f8'
  ctx.font = `700 92px ${FONT}`
  const words = String(slide.value).split(' ')
  let line = ''
  let y = 480
  for (const word of words) {
    const next = line ? line + ' ' + word : word
    if (ctx.measureText(next).width > 900 && line) {
      ctx.fillText(line, 88, y)
      y += 110
      line = word
    } else line = next
  }
  if (line) { ctx.fillText(line, 88, y); y += 110 }
  ctx.font = `400 36px ${FONT}`
  ctx.fillStyle = '#9aa3b2'
  const note = String(slide.note).split(' ')
  let noteLine = ''
  let noteY = y + 40
  for (const word of note) {
    const next = noteLine ? noteLine + ' ' + word : word
    if (ctx.measureText(next).width > 900 && noteLine) {
      ctx.fillText(noteLine, 88, noteY)
      noteY += 48
      noteLine = word
    } else noteLine = next
  }
  if (noteLine) ctx.fillText(noteLine, 88, noteY)
  ctx.font = `600 28px ${FONT}`
  ctx.fillStyle = '#6b7280'
  ctx.fillText('openGym', 88, 1800)
}

function YearStory({ year, years, close }) {
  const S = useStore(s => s.S)
  const toast = useUI(s => s.toast)
  const [y, setY] = useState(year)
  const [i, setI] = useState(0)
  const review = useMemo(() => yearReview(S, y), [S, y])
  const slides = useMemo(() => yearSlides(review), [review, S.lang])
  const slide = slides[Math.min(i, Math.max(slides.length - 1, 0))] || null
  const go = (dir) => setI(n => Math.min(slides.length - 1, Math.max(0, n + dir)))
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const share = async () => {
    if (!slide) return
    try {
      const canvas = document.createElement('canvas')
      paintSlide(canvas, slide)
      const how = await shareWorkoutCard(canvas, t('Your year'), 'opengym-year.png')
      if (how === 'saved') toast(t('Workout card saved'))
    } catch (e) {
      if (e?.name !== 'AbortError') toast(t('Could not share'))
    }
  }
  if (!slide) return <div className="muted small">{t('Finish your first workout to see progress curves here.')}</div>
  return <div className="year-story">
    {years.length > 1 && <div className="year-years">
      {years.map(item => <button key={item} type="button" className={item === y ? 'on' : ''} onClick={() => { setY(item); setI(0) }}>{item}</button>)}
    </div>}
    <div className="year-dots" aria-hidden="true">{slides.map((s, n) => <span key={s.key} className={n <= i ? 'on' : ''} />)}</div>
    <button type="button" className="year-hit left" aria-label={t('Back')} onClick={() => go(-1)} />
    <button type="button" className="year-hit right" aria-label={t('Next')} onClick={() => go(1)} />
    <div className="year-kicker">{slide.kicker}</div>
    <div className="year-value">{slide.value}</div>
    <div className="year-note">{slide.note}</div>
    <div className="year-actions">
      <Button size="sm" icon="chevronLeft" disabled={i === 0} onClick={() => go(-1)}>{t('Back')}</Button>
      <Button size="sm" icon="share" onClick={share}>{t('Send')}</Button>
      <Button size="sm" trailingIcon="chevronRight" disabled={i === slides.length - 1} onClick={() => go(1)}>{t('Next')}</Button>
    </div>
  </div>
}

export function yearReviewSheet(year) {
  const S = useStore.getState().S
  const years = reviewYears(S)
  const open = years.includes(year) ? year : years[0]
  if (open == null) return
  useUI.getState().openSheet(close => <YearStory year={open} years={years} close={close} />)
}

/** Home, only during December and January, and only when that year has a workout. */
export function YearHomeCard() {
  const S = useStore(s => s.S)
  const year = homeReviewYear()
  const review = year == null ? null : yearReview(S, year)
  if (!review) return null
  return <div className="card tappable" style={{ cursor: 'pointer' }} onClick={() => yearReviewSheet(year)}>
    <div className="row between">
      <div>
        <div className="lbl2">{review.year}</div>
        <div className="ttl">{t('Your year')}</div>
        <div className="muted small" style={{ marginTop: 4 }}>{t('Workouts, time, what you lifted, and the exercise you did most.')}</div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </div>
  </div>
}

/** Stats, any month. One row per year, newest first. */
export function YearStatsCard() {
  const S = useStore(s => s.S)
  const years = reviewYears(S)
  if (!years.length) return null
  return <div className="card" data-year-review>
    <h2>{t('Your year')}</h2>
    <div className="small dim" style={{ margin: '-4px 0 8px' }}>{t('Workouts, time, what you lifted, and the exercise you did most.')}</div>
    {years.map(year => {
      const review = yearReview(S, year)
      return <button key={year} type="button" className="slevel-row" onClick={() => yearReviewSheet(year)}>
        <span className="slevel-ex">{year}</span>
        <span className="slevel-meta">{t('{0} workouts', review.workouts)} · {liftedText(review)}</span>
      </button>
    })}
  </div>
}
