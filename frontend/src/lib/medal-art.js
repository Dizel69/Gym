// One picture per calendar month from January 2026 through December 2030.
// The same month in another year does not reuse it. Months outside this
// window still get a picture, shifted so they do not copy one of these sixty.
export const MEDAL_FROM = 2026
export const MEDAL_TO = 2030

export const MONTH_ICONS = [
  'kettlebell', 'barbell', 'dumbbell', 'plate', 'figureStrength', 'figureRun', 'pullup', 'boxing', 'bike', 'swim', 'stretch', 'timer',
  'trophy', 'medal', 'crown', 'star', 'shield', 'target', 'bolt', 'flame', 'heart', 'rocket', 'sparkles', 'lightbulb',
  'arm', 'abs', 'legs', 'scale', 'clock', 'bell', 'flag', 'key', 'lock', 'wrench', 'gear', 'globe',
  'sun', 'moon', 'camera', 'image', 'pencil', 'clipboard', 'list', 'link', 'qr', 'history', 'checkCircle', 'play',
  'house', 'calendar', 'chart', 'chartLine', 'person', 'personCircle', 'pause', 'download', 'upload', 'magnifier', 'info', 'folder',
]

function mod(n, k) {
  return ((n % k) + k) % k
}

export function medalMonths(from = MEDAL_FROM, to = MEDAL_TO) {
  const out = []
  for (let y = from; y <= to; y++) {
    for (let m = 1; m <= 12; m++) out.push(y + '-' + String(m).padStart(2, '0'))
  }
  return out
}

export function monthMedal(ym) {
  const [y, m] = String(ym).split('-').map(Number)
  const slot = (y - MEDAL_FROM) * 12 + (m - 1)
  const inSet = y >= MEDAL_FROM && y <= MEDAL_TO && m >= 1 && m <= 12
  const index = inSet ? slot : mod(y * 12 + (m - 1) + 17, MONTH_ICONS.length)
  return {
    icon: MONTH_ICONS[index],
    frame: mod(inSet ? slot : slot + 3, 5),
    metal: mod(inSet ? slot : slot + 1, 4),
  }
}
