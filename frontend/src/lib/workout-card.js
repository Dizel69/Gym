// A finished session drawn as one picture: the name, the exercises and the weights,
// ready to send into a chat. The text is pure so a test can read it. The canvas is
// only how that text becomes a file.
import { EXIDX } from './exercises.js'
import { setLabel } from './history.js'
import { exerciseNameFor, t } from './i18n-core.js'
import { capWords, fmtDate, fmtVol, durPart } from './format.js'
import { hasCompletedWork, isWarmupRow } from './workout-model.js'
import { MOBILE } from './mobile.js'

const FONT = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
const W = 1080
const PAD = 72
const GREEN = '#30d158'

function loggedSets(entry) {
  const done = (entry.sets || []).filter(hasCompletedWork)
  const work = done.filter(s => !isWarmupRow(s))
  return work.length ? work : done
}

/** The words on the card. Warm-ups stay off when the exercise has working sets. */
export function workoutCardModel(w, unit = 'kg') {
  const rows = (w?.entries || []).map(e => {
    const shown = loggedSets(e)
    if (!shown.length) return null
    const ex = EXIDX[e.id]
    return {
      name: capWords(ex ? exerciseNameFor(ex) : (e.n || e.id || '')),
      sets: shown.map(s => setLabel(e.id, s, e.target)).join(' · '),
      pr: !!(w.prs && w.prs.includes(e.id)),
    }
  }).filter(Boolean)
  const meta = [...durPart((w?.end || 0) - (w?.start || 0)), w?.vol ? fmtVol(w.vol, unit) : ''].filter(Boolean).join(' · ')
  return {
    title: capWords(w?.name || t('Workout')),
    when: w?.d ? fmtDate(w.d, true, true) : '',
    meta,
    rows,
  }
}

function wrap(ctx, text, max, font) {
  ctx.font = font
  const words = String(text || '').split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const out = []
  let cur = words[0]
  for (let i = 1; i < words.length; i++) {
    const next = cur + ' ' + words[i]
    if (ctx.measureText(next).width <= max) cur = next
    else { out.push(cur); cur = words[i] }
  }
  out.push(cur)
  return out
}

/** Paint `model` onto `canvas` at a fixed chat-sized resolution. */
export function paintWorkoutCard(canvas, model) {
  const measure = canvas.getContext('2d')
  const inner = W - PAD * 2
  const titleFont = `700 56px ${FONT}`
  const nameFont = `600 36px ${FONT}`
  const setFont = `400 30px ${FONT}`
  const titleLines = wrap(measure, model.title, inner, titleFont)
  const drawn = model.rows.map(r => ({
    name: wrap(measure, r.name, inner - (r.pr ? 88 : 0), nameFont),
    sets: wrap(measure, r.sets, inner, setFont),
    pr: r.pr,
  }))
  const height = PAD + 120 + titleLines.length * 68 + 56
    + drawn.reduce((n, r) => n + r.name.length * 48 + r.sets.length * 42 + 40, 0)
    + (drawn.length ? 0 : 60)
    + 80
  canvas.width = W
  canvas.height = Math.max(height, 420)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#121418'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = GREEN
  ctx.fillRect(0, 0, canvas.width, 10)

  let y = PAD
  ctx.font = `700 22px ${FONT}`
  ctx.fillStyle = GREEN
  ctx.fillText('OPENGYM', PAD, y + 22)
  y += 52
  ctx.fillStyle = '#f4f6f8'
  ctx.font = titleFont
  for (const line of titleLines) { ctx.fillText(line, PAD, y + 52); y += 68 }
  y += 6
  const sub = [model.when, model.meta].filter(Boolean).join('   ·   ')
  if (sub) {
    ctx.font = `400 28px ${FONT}`
    ctx.fillStyle = '#9aa3b2'
    ctx.fillText(sub, PAD, y + 28)
    y += 48
  }
  y += 8
  ctx.strokeStyle = 'rgba(255,255,255,.12)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
  y += 32

  if (!drawn.length) {
    ctx.font = `400 30px ${FONT}`
    ctx.fillStyle = '#9aa3b2'
    ctx.fillText(t('No exercises yet.'), PAD, y + 30)
    y += 60
  }
  drawn.forEach((r, i) => {
    ctx.font = nameFont
    ctx.fillStyle = '#f4f6f8'
    r.name.forEach((line, li) => {
      ctx.fillText(line, PAD, y + 36)
      if (li === 0 && r.pr) {
        const nameW = ctx.measureText(line).width
        ctx.font = `700 22px ${FONT}`
        ctx.fillStyle = GREEN
        ctx.fillText('PR', PAD + nameW + 18, y + 34)
        ctx.font = nameFont
        ctx.fillStyle = '#f4f6f8'
      }
      y += 48
    })
    ctx.font = setFont
    ctx.fillStyle = '#d5dbe6'
    r.sets.forEach(line => { ctx.fillText(line, PAD, y + 30); y += 42 })
    y += 10
    if (i < drawn.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,.08)'
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke()
      y += 22
    }
  })
  ctx.font = `600 22px ${FONT}`
  ctx.fillStyle = '#6b7280'
  ctx.fillText('openGym', PAD, canvas.height - 48)
}

function blobOf(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

function base64Of(blob) {
  return new Promise((resolve, reject) => {
    const rd = new FileReader()
    rd.onload = () => resolve(String(rd.result).split(',')[1] || '')
    rd.onerror = () => reject(rd.error)
    rd.readAsDataURL(blob)
  })
}

/** Hand the painted card to the phone share sheet, or save the file on the web. */
export async function shareWorkoutCard(canvas, title) {
  const blob = await blobOf(canvas)
  if (!blob) return 'saved'
  const filename = 'opengym-workout.png'
  if (MOBILE) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const written = await Filesystem.writeFile({ path: filename, data: await base64Of(blob), directory: Directory.Cache })
    await Share.share({ title, url: written.uri, dialogTitle: title })
    return 'shared'
  }
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title })
    return 'shared'
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1500)
  return 'saved'
}
