// Which decoration is up, from the calendar on this device. Nothing is fetched.
// New Year runs 14 December – 10 January. The doors are only 14–31 December.
// One day: 23 February, 8 March, 9 May, 12 June, 4 November.
// Spring is 1–3 May. Halloween is 29–31 October, so a single missed evening
// does not skip it. The equinoxes and the June solstice are the local calendar day
// of the Meeus instant; the December solstice falls inside New Year and only
// changes one door and the line under the title.

const SEASON = {
  march: [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
  june: [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
  september: [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
  december: [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
}
const TERMS = [
  [485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186],
  [182, 27.85, 445267.112], [156, 73.14, 45036.886], [136, 171.52, 22518.443],
  [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513],
  [58, 119.81, 33718.147], [52, 297.17, 150.678], [50, 21.02, 2281.226],
  [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
  [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029],
  [14, 199.76, 31436.921], [12, 95.39, 14577.848], [12, 287.11, 31931.756],
  [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074],
]
const D2R = Math.PI / 180

export const MOSCOW_LAT = 55.7558

function horner(x, c) {
  let y = 0
  for (let i = c.length - 1; i >= 0; i--) y = y * x + c[i]
  return y
}

function jdeOf(year, coeff) {
  const J0 = horner((year - 2000) / 1000, coeff)
  const T = (J0 - 2451545) / 36525
  const W = (35999.373 * T - 2.47) * D2R
  const delta = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W)
  let S = 0
  for (const [a, b, c] of TERMS) S += a * Math.cos((b + c * T) * D2R)
  return J0 + (0.00001 * S) / delta
}

function at(year, month, day) {
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

function stamp(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

function daysBetween(a, b) {
  const utc = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((utc(b) - utc(a)) / 86400000)
}

/** The equinox or solstice instant. `kind` is march, june, september or december. */
export function seasonUtc(year, kind) {
  const ms = (jdeOf(year, SEASON[kind]) - 2440587.5) * 86400000
  const date = new Date(ms)
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate(), date }
}

function seasonLocal(year, kind) {
  const { date } = seasonUtc(year, kind)
  return at(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

/** Local YYYY-MM-DD of the December solstice: the longest night, inside New Year. */
export function winterSolsticeIso(year) {
  return isoOfDate(seasonLocal(year, 'december'))
}

function windows(year) {
  const spring = seasonLocal(year, 'march')
  const summer = seasonLocal(year, 'june')
  const autumn = seasonLocal(year, 'september')
  return [
    { id: 'newyear', start: at(year, 12, 14), end: at(year + 1, 1, 10) },
    { id: 'feb23', start: at(year, 2, 23), end: at(year, 2, 23) },
    { id: 'mar8', start: at(year, 3, 8), end: at(year, 3, 8) },
    { id: 'equinox', turn: 'spring', start: spring, end: spring },
    { id: 'spring', start: at(year, 5, 1), end: at(year, 5, 3) },
    { id: 'may9', start: at(year, 5, 9), end: at(year, 5, 9) },
    { id: 'jun12', start: at(year, 6, 12), end: at(year, 6, 12) },
    { id: 'solstice', turn: 'summer', start: summer, end: summer },
    { id: 'equinox', turn: 'autumn', start: autumn, end: autumn },
    { id: 'halloween', start: at(year, 10, 29), end: at(year, 10, 31) },
    { id: 'unity', start: at(year, 11, 4), end: at(year, 11, 4) },
  ]
}

function contains(date, w) {
  const n = stamp(date)
  return n >= stamp(w.start) && n <= stamp(w.end)
}

function distance(date, w) {
  const n = stamp(date)
  if (n < stamp(w.start)) return daysBetween(date, w.start)
  if (n > stamp(w.end)) return daysBetween(w.end, date)
  return 0
}

export function holidayOn(date) {
  const y = date.getFullYear()
  for (const year of [y - 1, y]) {
    for (const w of windows(year)) if (contains(date, w)) return w
  }
  return null
}

/** Closest decoration, for the Always switch between the dated windows. */
export function holidayNearest(date) {
  const y = date.getFullYear()
  let best = null
  let bestDist = Infinity
  for (const year of [y - 1, y, y + 1]) {
    for (const w of windows(year)) {
      const dist = distance(date, w)
      const upcoming = stamp(w.start) >= stamp(date)
      const bestUpcoming = best && stamp(best.start) >= stamp(date)
      if (dist < bestDist || (dist === bestDist && upcoming && !bestUpcoming)) {
        best = w
        bestDist = dist
      }
    }
  }
  return best
}

export function previewDate() {
  if (typeof window === 'undefined') return null
  const q = new URLSearchParams(window.location.search).get('decorDay')
  if (!q || !/^\d{4}-\d{2}-\d{2}$/.test(q)) return null
  const [y, m, d] = q.split('-').map(Number)
  const date = at(y, m, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export function activeHoliday(now = new Date(), mode = 'auto') {
  const preview = previewDate()
  if (preview) return holidayOn(preview)
  if (mode === 'off') return null
  if (mode === 'always') return holidayNearest(now)
  return holidayOn(now)
}

export function isoOfDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function adventDays(year) {
  const days = []
  for (let d = 14; d <= 31; d++) days.push(year + '-12-' + String(d).padStart(2, '0'))
  return days
}

/** `future` stays shut, `today` glows, `wait` is a missed door, `open` was already read. */
export function doorState(iso, todayIso, opened) {
  if (iso > todayIso) return 'future'
  if (opened && opened.includes(iso)) return 'open'
  if (iso === todayIso) return 'today'
  return 'wait'
}

/** Whole days from `date` to 1 January of the next year. 0 on 1 January itself. */
export function daysToNewYear(date) {
  const ny = new Date(date.getFullYear() + 1, 0, 1, 12)
  return date.getMonth() === 0 && date.getDate() === 1 ? 0 : daysBetween(date, ny)
}

/**
 * Minutes of daylight on that local day, sunrise to sunset with the usual −0.833°
 * for refraction and the sun's radius. Low-precision sun (Astronomical Almanac),
 * good to about a minute, which is all a banner needs.
 */
export function dayLength(date, lat = MOSCOW_LAT) {
  const noon = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  const n = noon / 86400000 + 2440587.5 - 2451545
  const L = (280.46 + 0.9856474 * n) * D2R
  const g = (357.528 + 0.9856003 * n) * D2R
  const lambda = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R
  const eps = (23.439 - 0.0000004 * n) * D2R
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const phi = lat * D2R
  const cosH = (Math.sin(-0.833 * D2R) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl))
  if (cosH <= -1) return 1440
  if (cosH >= 1) return 0
  return (2 * Math.acos(cosH) / D2R / 15) * 60
}

/** Seconds of daylight tomorrow minus today. Positive while the days grow. */
export function dayLengthChange(date, lat = MOSCOW_LAT) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 12)
  return Math.round((dayLength(next, lat) - dayLength(date, lat)) * 60)
}
