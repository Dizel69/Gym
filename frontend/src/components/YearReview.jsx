// Year stories live on Home from 14 to 31 December. Stats shows one month.
// The picture is the story on screen, shared the same way as a workout card.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t, dateLocale, exerciseNameFor, getLang } from '../lib/i18n.js'
import { fmtDate, fmtNum, fmtVol } from '../lib/format.js'
import { EXIDX } from '../lib/exercises.js'
import { yearReview, reviewYears, homeReviewYear, monthKey, monthStats, monthsWithWorkouts, shiftMonth } from '../lib/year-review.js'
import { shareWorkoutCard } from '../lib/workout-card.js'
import { Button } from './ui.jsx'
import Icon from './Icon.jsx'

const FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'

function everyDaysText(n) {
  if (getLang() !== 'ru') return t('About once every {0} days, from the first session to the last.', n)
  const n10 = n % 10
  const n100 = n % 100
  const word = n10 === 1 && n100 !== 11 ? 'день' : (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 'дня' : 'дней')
  return 'Примерно раз в ' + n + ' ' + word + ', от первой тренировки до последней.'
}

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

function monthTitle(ym, withYear) {
  const text = new Date(ym + '-02T12:00:00').toLocaleDateString(dateLocale(), withYear ? { month: 'long', year: 'numeric' } : { month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function setText(set) {
  return fmtNum(set.w) + '×' + set.r
}

function signedAmount(delta, text) {
  if (!delta) return t('Same weight')
  return (delta > 0 ? '+' : '−') + text
}

function progressSlide(review) {
  const p = review.progress
  if (!p) return null
  if (p.delta == null) {
    const delta = p.last.volume - p.first.volume
    return {
      key: 'progress',
      kicker: t('First and last'),
      value: signedAmount(delta, fmtVol(Math.abs(delta), review.unit)),
      note: t('First session {0}. Last session {1}.', fmtVol(p.first.volume, review.unit), fmtVol(p.last.volume, review.unit)),
    }
  }
  return {
    key: 'progress',
    kicker: favoriteName({ id: p.id, name: p.name }),
    value: signedAmount(p.delta, fmtNum(Math.abs(p.delta)) + ' ' + review.unit),
    note: t('First on {0}: {1}. Last on {2}: {3}.', fmtDate(p.first.d), setText(p.first), fmtDate(p.last.d), setText(p.last)),
  }
}

export function yearSlides(review) {
  if (!review) return []
  const slides = [
    { key: 'cover', kicker: String(review.year), value: t('Your year'), note: t('{0} workouts, from your own log.', fmtNum(review.workouts)) },
    {
      key: 'workouts',
      kicker: t('Workouts'),
      value: fmtNum(review.workouts),
      note: review.everyDays
        ? everyDaysText(review.everyDays)
        : t('The only one in the log this year.'),
    },
    {
      key: 'lifted',
      kicker: t('Lifted'),
      value: liftedText(review),
      note: review.bodyCopies
        ? t('That is {0} times your body weight. Warm-ups are left out.', fmtNum(review.bodyCopies))
        : t('About {0} a workout. Warm-ups are left out.', fmtVol(review.avgVolume, review.unit)),
    },
  ]
  if (review.heaviest && review.workouts > 1) slides.push({
    key: 'average',
    kicker: t('An average workout'),
    value: fmtVol(review.avgVolume, review.unit),
    note: t('The heaviest was {0}, on {1}.', fmtVol(review.heaviest.volume, review.unit), fmtDate(review.heaviest.d)),
  })
  const progress = progressSlide(review)
  if (progress) slides.push(progress)
  if (review.favorite) slides.push({
    key: 'favorite',
    kicker: t('Favourite exercise'),
    value: favoriteName(review.favorite),
    note: t('{0} working sets', review.favorite.sets) + '. ' + t('Nothing else shows up this often.'),
  })
  if (review.busiest && review.workouts > 1) slides.push({
    key: 'busiest',
    kicker: t('Busiest month'),
    value: monthTitle(review.busiest.ym, false),
    note: t('{0} of {1} this year.', fmtVol(review.busiest.volume, review.unit), liftedText(review)),
  })
  if (review.streak > 1) slides.push({
    key: 'streak',
    kicker: t('Streak'),
    value: weeksText(review.streak),
    note: t('The longest run of weeks with a workout.'),
  })
  if (review.avgMin && review.longestMin) slides.push({
    key: 'hours',
    kicker: t('Time'),
    value: hoursText(review.hours),
    note: t('An average session is {0} min. The longest is {1}.', review.avgMin, hoursText(review.longestMin / 60)),
  })
  if (review.joke && review.lift) slides.push({
    key: 'joke',
    kicker: favoriteName(review.lift),
    value: fmtVol(review.lift.est, review.unit),
    note: t('Like {0}.', thingText(review.joke)),
  })
  if (review.community) slides.push({
    key: 'community',
    kicker: favoriteName(review.community),
    value: fmtVol(review.community.est, review.unit),
    note: communityNote(review),
  })
  slides.push({
    key: 'summary',
    kicker: String(review.year),
    value: t('The whole year'),
    note: '',
    lines: summaryLines(review),
  })
  return slides
}

function thingText(joke) {
  const many = joke.count !== 1
  const key = {
    dog: many ? '{0} dogs' : '{0} dog',
    cement: many ? '{0} cement bags' : '{0} cement bag',
    wardrobe: many ? '{0} wardrobes' : '{0} wardrobe',
    car: many ? '{0} cars' : '{0} car',
  }[joke.key]
  if (getLang() !== 'ru' || !key) return t(key || '{0}', joke.count)
  return ruThing(joke)
}

function ruThing(joke) {
  const n = joke.count
  const n10 = n % 10
  const n100 = n % 100
  const form = n10 === 1 && n100 !== 11 ? 0 : (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 1 : 2)
  const words = {
    dog: ['собака', 'собаки', 'собак'],
    cement: ['мешок цемента', 'мешка цемента', 'мешков цемента'],
    wardrobe: ['шкаф', 'шкафа', 'шкафов'],
    car: ['машина', 'машины', 'машин'],
  }[joke.key]
  return n + ' ' + words[form]
}

function communityNote(review) {
  const mark = fmtVol(review.community.average, review.unit)
  const women = review.community.sex === 'female'
  const head = t(women ? 'The published average for women is {0}.' : 'The published average for men is {0}.', mark)
  const gap = Math.abs(review.community.delta)
  const tail = gap < 0.05
    ? t('Right on that mark.')
    : t(review.community.delta > 0 ? '{0} over that mark.' : '{0} under that mark.', fmtVol(gap, review.unit))
  return head + ' ' + tail
}

function summaryLines(review) {
  const lines = [
    { label: t('Workouts'), value: fmtNum(review.workouts) },
    { label: t('Lifted'), value: liftedText(review) },
  ]
  if (review.pile) lines.push({ label: t('Like'), value: thingText(review.pile) })
  if (review.hours != null) lines.push({ label: t('Time'), value: hoursText(review.hours) })
  if (review.favorite) lines.push({ label: t('Favourite exercise'), value: favoriteName(review.favorite) })
  if (review.progress && review.progress.delta != null) {
    lines.push({
      label: favoriteName({ id: review.progress.id, name: review.progress.name }),
      value: signedAmount(review.progress.delta, fmtNum(Math.abs(review.progress.delta)) + ' ' + review.unit),
    })
  }
  if (review.joke && review.lift) lines.push({ label: favoriteName(review.lift), value: thingText(review.joke) })
  return lines
}

function paintSlide(canvas, slide) {
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')
  if (slide.lines) return paintSummary(ctx, slide)
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

function paintSummary(ctx, slide) {
  ctx.fillStyle = '#121418'
  ctx.fillRect(0, 0, 1080, 1920)
  ctx.fillStyle = '#30d158'
  ctx.fillRect(0, 0, 1080, 14)
  ctx.font = `700 28px ${FONT}`
  ctx.fillText('OPENGYM', 88, 180)
  ctx.fillStyle = '#f4f6f8'
  ctx.font = `700 72px ${FONT}`
  ctx.fillText(String(slide.kicker), 88, 300)
  ctx.fillStyle = '#30d158'
  ctx.font = `600 36px ${FONT}`
  ctx.fillText(String(slide.value).toUpperCase(), 88, 360)
  let y = 480
  for (const line of slide.lines) {
    ctx.fillStyle = '#9aa3b2'
    ctx.font = `500 28px ${FONT}`
    ctx.fillText(String(line.label).toUpperCase(), 88, y)
    ctx.fillStyle = '#f4f6f8'
    ctx.font = `700 48px ${FONT}`
    ctx.fillText(String(line.value), 88, y + 58)
    y += 130
  }
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
    {slide.lines
      ? <div className="year-summary">{slide.lines.map((line, n) => <div key={n}><span>{line.label}</span><b>{line.value}</b></div>)}</div>
      : <div className="year-note">{slide.note}</div>}
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

/** Home, only 14–31 December, and only when that year has a workout. */
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
        <div className="muted small" style={{ marginTop: 4 }}>{t('First against last, and how the year sits next to your own average.')}</div>
      </div>
      <Icon name="chevronRight" className="chev" />
    </div>
  </div>
}

function monthCompare(cur, prev) {
  if (!prev.workouts) return cur.workouts ? t('Nothing the month before.') : null
  const name = monthTitle(prev.ym, false).toLowerCase()
  const dw = cur.workouts - prev.workouts
  const count = fmtNum(Math.abs(dw))
  const workouts = dw > 0
    ? t('{0} more workouts than for {1}.', count, name)
    : dw < 0
      ? t('{0} fewer workouts than for {1}.', count, name)
      : t('As many workouts as for {1}.', '', name)
  const dv = cur.volume - prev.volume
  const vol = Math.abs(dv) < 1e-6
    ? t('Same volume.')
    : dv > 0
      ? t('Volume {0} heavier.', fmtVol(dv, cur.unit))
      : t('Volume {0} lighter.', fmtVol(-dv, cur.unit))
  return workouts + ' ' + vol
}

/** Stats: the selected month against the month before it. */
export function MonthStatsCard() {
  const S = useStore(s => s.S)
  const months = monthsWithWorkouts(S)
  const [ym, setYm] = useState(() => monthKey())
  if (!months.length) return null
  const earliest = months[months.length - 1]
  const latest = monthKey()
  const stat = monthStats(S, ym)
  const prev = monthStats(S, shiftMonth(ym, -1))
  const compare = monthCompare(stat, prev)
  return <div className="card" data-month-stats>
    <div className="row between">
      <button type="button" className="iconbtn" aria-label={t('Prev')} disabled={ym <= earliest} onClick={() => setYm(shiftMonth(ym, -1))}><Icon name="chevronLeft" /></button>
      <h2 style={{ margin: 0 }}>{monthTitle(ym, true)}</h2>
      <button type="button" className="iconbtn" aria-label={t('Next')} disabled={ym >= latest} onClick={() => setYm(shiftMonth(ym, 1))}><Icon name="chevronRight" /></button>
    </div>
    {stat.workouts ? <div className="month-stats">
      <div><span className="dim">{t('Workouts')}</span><b>{fmtNum(stat.workouts)}</b></div>
      <div><span className="dim">{t('Time')}</span><b>{stat.hours == null ? '—' : hoursText(stat.hours)}</b></div>
      <div><span className="dim">{t('Lifted')}</span><b>{liftedText(stat)}</b></div>
    </div> : <div className="muted small" style={{ marginTop: 10 }}>{t('No workouts this month.')}</div>}
    {compare && <div className="muted small" style={{ marginTop: 8 }}>{compare}</div>}
  </div>
}
