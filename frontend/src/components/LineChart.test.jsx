// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import LineChart from './LineChart.jsx'
import { fmtDate, isoOf } from '../lib/format.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const point = (year, month, day, y) => ({
  d: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  t: new Date(year, month - 1, day, 12).getTime(),
  y
})

const firstPoints = [
  { t: Date.UTC(2026, 0, 1), y: 80, d: '2026-01-01' },
  { t: Date.UTC(2026, 0, 15), y: 82, d: '2026-01-15' },
]
const nextPoints = [
  { t: Date.UTC(2026, 1, 1), y: 78, d: '2026-02-01' },
  { t: Date.UTC(2026, 1, 15), y: 79, d: '2026-02-15' },
]

function renderChart(points, extra) {
  act(() => root.render(<LineChart points={points} axes={false} unit="kg" {...extra} />))
}

function hoverAt(clientX) {
  act(() => {
    container.querySelector('.chart-i').dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX }))
  })
  return container.querySelector('.ctip').textContent
}

describe('LineChart hover date', () => {
  it('keeps same-year points in the compact format', () => {
    const first = point(2026, 1, 15, 70)
    renderChart([first, point(2026, 2, 15, 71)])

    expect(hoverAt(0)).toBe(`${fmtDate(first.d, true)} · 70 kg`)
  })

  it('includes the calendar year at a short cross-year boundary', () => {
    const first = point(2025, 11, 30, 70)
    const last = point(2026, 2, 1, 71)
    renderChart([first, last])

    expect(hoverAt(0)).toBe(`${fmtDate(first.d, true, true)} · 70 kg`)
    expect(hoverAt(340)).toBe(`${fmtDate(last.d, true, true)} · 71 kg`)
  })

  it('keeps a single point compact', () => {
    const only = point(2026, 7, 4, 70)
    renderChart([only])

    expect(hoverAt(170)).toBe(`${fmtDate(only.d, true)} · 70 kg`)
  })

  it('uses timestamp-only points when deciding whether to show the year', () => {
    const first = point(2025, 12, 31, 70)
    const last = point(2026, 1, 1, 71)
    const timestampOnly = [{ t: first.t, y: first.y }, { t: last.t, y: last.y }]
    renderChart(timestampOnly)

    const lastIso = isoOf(new Date(last.t))
    expect(hoverAt(340)).toBe(`${fmtDate(lastIso, true, true)} · 71 kg`)
  })
})

describe('LineChart hover state', () => {
  it('clears the tooltip and hover markers when points are replaced, then allows hovering again', () => {
    renderChart(firstPoints)
    hoverAt(170)

    expect(container.querySelector('.ctip')).toBeTruthy()
    expect(container.querySelector('.cvl')).toBeTruthy()
    expect(container.querySelector('.chl')).toBeTruthy()

    renderChart(nextPoints)

    expect(container.querySelector('.ctip')).toBeNull()
    expect(container.querySelector('.cvl')).toBeNull()
    expect(container.querySelector('.chl')).toBeNull()

    hoverAt(170)
    expect(container.querySelector('.ctip')).toBeTruthy()
    expect(container.querySelector('.cvl')).toBeTruthy()
  })
})

describe('LineChart date axis', () => {
  it('puts a short span on the real days, with the gap the calendar actually has', () => {
    const days = [point(2026, 11, 7, 132), point(2026, 11, 9, 132), point(2026, 11, 10, 133.5)]
    renderChart(days, { axes: true })
    const labels = [...container.querySelectorAll('svg text')]
      .filter(n => /Nov/.test(n.textContent))
      .map(n => ({ txt: n.textContent, x: Number(n.getAttribute('x')) }))
    const at = prefix => labels.find(l => l.txt.startsWith(prefix))
    const a = at('7 '), b = at('9 '), c = at('10 ')
    expect(a && b && c).toBeTruthy()
    // 7 → 9 is two days, 9 → 10 is one, so the middle label sits twice as far from the first.
    expect(b.x - a.x).toBeCloseTo(2 * (c.x - b.x), 0)
    expect(b.x).toBeGreaterThan((a.x + c.x) / 2)
  })
})

describe('LineChart day labels', () => {
  it('labels at least five workout dates instead of the months they fall in', () => {
    const days = [1, 8, 15, 22, 29, 5].map((day, i) => point(i < 5 ? 2026 : 2026, i < 5 ? 8 : 9, day, 40 + i * 5))
    renderChart(days, { axes: true, dayLabels: true })
    const labels = [...container.querySelectorAll('svg text')].map(n => n.textContent).filter(txt => /\d/.test(txt) && /[A-Za-zА-Яа-я]/.test(txt))
    expect(labels.length).toBeGreaterThanOrEqual(5)
    expect(labels.some(txt => txt.startsWith('1 '))).toBe(true)
    expect(labels.some(txt => txt.startsWith('5 '))).toBe(true)
  })
})

describe('LineChart plateau', () => {
  it('draws a dashed segment only where the weight stays the same', () => {
    renderChart([point(2026, 8, 1, 45), point(2026, 8, 15, 50), point(2026, 9, 1, 50), point(2026, 10, 1, 55)], { dashFlat: true, dots: true })
    const dashes = [...container.querySelectorAll('svg line')].map(l => l.getAttribute('stroke-dasharray'))
    expect(dashes.filter(d => d === '7 5')).toHaveLength(1)
    expect(dashes.filter(d => d == null)).toHaveLength(2)
    expect(container.querySelectorAll('svg circle')).toHaveLength(4)
  })
})
