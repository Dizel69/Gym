// Where the tape sits on the muscle-map silhouette. The picture is the same front
// view the muscle map draws; the seams between muscles are not part of the tape.

// The muscle paths pack arc flags against the next number (`0 01.2` is flag 0,
// flag 1, then 1.2), so a generic number split lands the tape in the wrong place.
function pointsOf(d) {
  const s = String(d)
  const pts = []
  let i = 0
  let cmd = ''
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  const skip = () => { while (i < s.length && /[\s,]/.test(s[i])) i++ }
  const number = () => {
    skip()
    const start = i
    if (s[i] === '+' || s[i] === '-') i++
    let dot = false
    while (i < s.length) {
      const c = s[i]
      if (c >= '0' && c <= '9') { i++; continue }
      if (c === '.' && !dot) { dot = true; i++; continue }
      break
    }
    if (i === start || i === start + 1 && (s[start] === '+' || s[start] === '-')) {
      i = start
      return null
    }
    return +s.slice(start, i)
  }
  const flag = () => {
    skip()
    if (s[i] !== '0' && s[i] !== '1') return null
    return +s[i++]
  }
  const push = (x, y) => { pts.push([x, y]); cx = x; cy = y }
  while (i < s.length) {
    skip()
    if (i >= s.length) break
    if (/[a-z]/i.test(s[i])) cmd = s[i++]
    if (!cmd) break
    const rel = cmd === cmd.toLowerCase()
    const C = cmd.toUpperCase()
    if (C === 'Z') { cx = sx; cy = sy; continue }
    if (C === 'H' || C === 'V') {
      let n = number()
      if (n == null) break
      while (n != null) {
        if (C === 'H') cx = rel ? cx + n : n
        else cy = rel ? cy + n : n
        pts.push([cx, cy])
        n = number()
      }
      continue
    }
    if (C === 'A') {
      const rx = number()
      if (rx == null) break
      const ry = number()
      const rot = number()
      const large = flag()
      const sweep = flag()
      const x = number()
      const y = number()
      if ([ry, rot, large, sweep, x, y].some(v => v == null)) break
      push(rel ? cx + x : x, rel ? cy + y : y)
      continue
    }
    const pairs = C === 'C' ? 3 : C === 'S' || C === 'Q' ? 2 : 1
    let n = number()
    if (n == null) break
    let first = true
    while (n != null) {
      const nums = [n]
      let ok = true
      for (let k = 1; k < pairs * 2; k++) {
        const v = number()
        if (v == null) { ok = false; break }
        nums.push(v)
      }
      if (!ok) break
      for (let k = 0; k < nums.length; k += 2) {
        const x = rel ? cx + nums[k] : nums[k]
        const y = rel ? cy + nums[k + 1] : nums[k + 1]
        if (k + 2 >= nums.length) push(x, y)
        else pts.push([x, y])
      }
      if ((C === 'M' || cmd === 'M' || cmd === 'm') && first) {
        sx = cx
        sy = cy
        first = false
        cmd = rel ? 'l' : 'L'
      }
      n = number()
    }
  }
  return pts
}

function boxOf(d) {
  const pts = pointsOf(d)
  if (!pts.length) return null
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const [x, y] of pts) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}

function union(boxes) {
  const list = boxes.filter(Boolean)
  if (!list.length) return null
  return list.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
}

function withSize(box) {
  if (!box) return null
  return { ...box, cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, w: box.maxX - box.minX, h: box.maxY - box.minY }
}

function boxes(front, slug) {
  return (front?.p?.[slug] || []).map(boxOf).filter(Boolean)
}

// The tape is drawn a little outside the muscle paths, on the painted outline.
// The female view is a different drawing, so the same offset does not fit both.
function outlinePad(front) {
  return /1450/.test(String(front?.vb)) ? 16 : 6
}

function pathsOf(front, slugs) {
  return slugs.flatMap(slug => front?.p?.[slug] || [])
}

function span(front, slugs) {
  return withSize(union(slugs.flatMap(slug => boxes(front, slug))))
}

// A front view faces the reader, so the person's left limbs are on the right of the picture.
function midX(front) {
  const [x, , w] = String(front.vb).split(/[\s,]+/).map(Number)
  return x + w / 2
}

function onSide(front, d, personSide) {
  const box = boxOf(d)
  if (!box || box.w < 3 || box.h < 3) return false
  return personSide === 'left' ? box.cx >= midX(front) : box.cx < midX(front)
}

// Width of the body at one height, from the points of the paths that pass there.
function sliceAt(list, y, tol, ry) {
  const xs = []
  for (const d of list) {
    for (const [x, py] of pointsOf(d)) if (Number.isFinite(x) && Math.abs(py - y) <= tol) xs.push(x)
  }
  if (xs.length < 2) return null
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  return { cx: (minX + maxX) / 2, cy: y, rx: Math.max((maxX - minX) / 2, ry * 1.3), ry }
}

function hipTape(front, ry) {
  const box = span(front, ['quadriceps'])
  if (!box) return null
  const y = box.minY + Math.max(box.h * 0.035, 16)
  const band = sliceAt(pathsOf(front, ['quadriceps', 'hip-flexors', 'adductors']), y, 30, ry)
  if (band) band.rx += outlinePad(front)
  return band
}

function torsoTape(front, slugs, yFrac, ry) {
  const box = span(front, slugs)
  if (!box) return null
  const y = box.minY + box.h * yFrac
  const band = sliceAt(pathsOf(front, slugs), y, Math.max(box.h * 0.07, 16), ry)
  if (band) band.rx += outlinePad(front)
  return band
}

// The tape crosses the limb, so a slanted arm gets a matching tilt.
function limbTape(front, slugs, personSide, yFrac, ry) {
  const list = pathsOf(front, slugs).filter(d => onSide(front, d, personSide))
  if (!list.length) return null
  const main = list.reduce((best, d) => {
    const box = boxOf(d)
    const area = box.w * box.h
    return area > best.area ? { d, box, area } : best
  }, { area: 0 })
  const { box } = main
  const y = box.minY + box.h * yFrac
  const overlapping = list
    .map(d => boxOf(d))
    .filter(b => b && b.w > 6 && b.maxY >= y - 10 && b.minY <= y + 10)
  const spanBox = withSize(union(overlapping)) || box
  const band = {
    cx: spanBox.cx,
    cy: y,
    rx: Math.max(spanBox.w / 2, ry * 1.3),
    ry,
  }
  const pts = pointsOf(main.d)
  const top = pts.filter(p => p[1] <= box.minY + box.h * 0.22)
  const bot = pts.filter(p => p[1] >= box.maxY - box.h * 0.22)
  if (top.length && bot.length) {
    const avg = list => list.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map(n => n / list.length)
    const a = avg(top)
    const b = avg(bot)
    const ang = Math.atan2(b[0] - a[0], b[1] - a[1])
    const c = Math.cos(ang)
    if (c > 0.4) band.rx = Math.max(band.rx * c, ry * 1.3)
    const deg = ang * 180 / Math.PI
    if (Math.abs(deg) > 6) band.rotate = deg
  }
  // The drawn outline is fatter than the muscle paths, so the tape reaches that edge.
  band.rx += outlinePad(front) + 4
  return band
}

// `ry` is a fraction of the viewBox height, so the same tape reads on both bodies.
function tapeFor(front, part) {
  if (!front) return null
  const [, , , h] = String(front.vb).split(/[\s,]+/).map(Number)
  const thin = h * 0.011
  const arm = side => limbTape(front, ['biceps', 'triceps'], side, 0.7, thin * 0.85)
  const fore = side => limbTape(front, ['forearm'], side, 0.45, thin * 0.8)
  const wrist = side => limbTape(front, ['forearm'], side, 0.92, thin * 0.7)
  const thigh = side => limbTape(front, ['quadriceps', 'adductors'], side, 0.42, thin * 0.95)
  const calf = side => limbTape(front, ['calves', 'tibialis'], side, 0.4, thin * 0.8)
  const ankle = side => limbTape(front, ['ankles'], side, 0.18, thin * 0.7)
  const at = {
    neck: torsoTape(front, ['neck'], 0.62, thin),
    shoulders: torsoTape(front, ['front-deltoid', 'side-deltoid'], 0.38, thin),
    chest: torsoTape(front, ['chest', 'serratus'], 0.5, thin),
    waist: torsoTape(front, ['abs', 'obliques'], 0.58, thin),
    abdomen: torsoTape(front, ['abs', 'obliques'], 0.74, thin),
    hips: hipTape(front, thin * 1.05),
    upperArmLeft: arm('left'),
    upperArmRight: arm('right'),
    forearmLeft: fore('left'),
    forearmRight: fore('right'),
    wristLeft: wrist('left'),
    wristRight: wrist('right'),
    thighLeft: thigh('left'),
    thighRight: thigh('right'),
    calfLeft: calf('left'),
    calfRight: calf('right'),
    ankleLeft: ankle('left'),
    ankleRight: ankle('right'),
  }
  return at[part] || null
}

export { pointsOf, tapeFor }
