// Front-view chest geometry: three fiber-fan departments per pec, clipped from the real outline.
import { pointsOf } from './measure-outline.js'

export const CHEST_DEPARTMENTS = ['upper-chest', 'mid-chest', 'lower-chest']

// Per-seam lateral/medial heights and quadratic bow (fractions of each pec bbox height).
export const CHEST_FRACTIONS = {
  upperLatY: 0.2,
  upperMedY: 0.35,
  upperBowY: 0.205,
  lowerLatY: 0.84,
  lowerMedY: 0.73,
  lowerBowY: 0.855,
}

const OUT_PAD = 120

function bboxOfPath(d) {
  const pts = pointsOf(d)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of pts) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

function round(n) {
  return Math.round(n * 100) / 100
}

function qd(x1, y1, cx, cy, x2, y2) {
  return `M${round(x1)} ${round(y1)} Q${round(cx)} ${round(cy)} ${round(x2)} ${round(y2)}`
}

function pecFan(d, vb, side) {
  const { minX, minY, maxX, maxY } = bboxOfPath(d)
  const h = maxY - minY
  const f = CHEST_FRACTIONS
  const upperLatY = minY + h * f.upperLatY
  const upperMedY = minY + h * f.upperMedY
  const lowerLatY = minY + h * f.lowerLatY
  const lowerMedY = minY + h * f.lowerMedY
  const latX = side === 'left' ? minX : maxX
  const medX = side === 'left' ? maxX : minX
  const latOut = side === 'left' ? latX - OUT_PAD : latX + OUT_PAD
  const upperCtrlX = latX * 0.38 + medX * 0.62
  const lowerCtrlX = latX * 0.42 + medX * 0.58
  const upperCtrlY = minY + h * f.upperBowY
  const lowerCtrlY = minY + h * f.lowerBowY

  const seams = {
    upper: qd(latX, upperLatY, upperCtrlX, upperCtrlY, medX, upperMedY),
    lower: qd(latX, lowerLatY, lowerCtrlX, lowerCtrlY, medX, lowerMedY),
  }

  let clips
  if (side === 'right') {
    clips = {
      'upper-chest': `M${round(minX)} ${round(minY - OUT_PAD)} L${round(latOut)} ${round(minY - OUT_PAD)} L${round(latOut)} ${round(upperLatY)} Q${round(upperCtrlX)} ${round(upperCtrlY)} ${round(medX)} ${round(upperMedY)} Z`,
      'mid-chest': `M${round(medX)} ${round(upperMedY)} Q${round(upperCtrlX)} ${round(upperCtrlY)} ${round(latOut)} ${round(upperLatY)} L${round(latOut)} ${round(lowerLatY)} Q${round(lowerCtrlX)} ${round(lowerCtrlY)} ${round(medX)} ${round(lowerMedY)} Z`,
      'lower-chest': `M${round(medX)} ${round(lowerMedY)} Q${round(lowerCtrlX)} ${round(lowerCtrlY)} ${round(latOut)} ${round(lowerLatY)} L${round(latOut)} ${round(maxY + OUT_PAD)} L${round(medX)} ${round(maxY + OUT_PAD)} Z`,
    }
  } else {
    clips = {
      'upper-chest': `M${round(medX)} ${round(minY - OUT_PAD)} L${round(latOut)} ${round(minY - OUT_PAD)} L${round(latOut)} ${round(upperLatY)} Q${round(upperCtrlX)} ${round(upperCtrlY)} ${round(medX)} ${round(upperMedY)} Z`,
      'mid-chest': `M${round(medX)} ${round(upperMedY)} Q${round(upperCtrlX)} ${round(upperCtrlY)} ${round(latOut)} ${round(upperLatY)} L${round(latOut)} ${round(lowerLatY)} Q${round(lowerCtrlX)} ${round(lowerCtrlY)} ${round(medX)} ${round(lowerMedY)} Z`,
      'lower-chest': `M${round(medX)} ${round(lowerMedY)} Q${round(lowerCtrlX)} ${round(lowerCtrlY)} ${round(latOut)} ${round(lowerLatY)} L${round(latOut)} ${round(maxY + OUT_PAD)} L${round(medX)} ${round(maxY + OUT_PAD)} Z`,
    }
  }

  return { side, outline: d, bbox: { minX, minY, maxX, maxY }, seams, clips }
}

function viewCenterX(vb) {
  const [x, , w] = vb.split(' ').map(Number)
  return x + w / 2
}

/** Given a front view `{ vb, p }`, return per-pec department clip and seam paths. Back views → []. */
export function chestDepartmentsFor(view) {
  const paths = view?.p?.chest
  if (!paths?.length) return []
  const vcx = viewCenterX(view.vb)
  return paths.map(d => {
    const { cx } = bboxOfPath(d)
    return pecFan(d, view.vb, cx < vcx ? 'left' : 'right')
  })
}

/** @param {Record<string, {front, back}>} paths body-paths root */
export function chestPieces(paths) {
  const out = {}
  for (const body of Object.keys(paths || {})) {
    out[body] = {
      front: chestDepartmentsFor(paths[body].front),
      back: chestDepartmentsFor(paths[body].back),
    }
  }
  return out
}
