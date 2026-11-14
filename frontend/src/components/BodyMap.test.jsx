// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import BodyMap, { BodyMapLegend } from './BodyMap.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeAll(() => import('../lib/body-paths.js'))

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function renderMap(props = {}) {
  await act(async () => {
    root.render(<BodyMap load={{ 'upper-chest': 4, 'mid-chest': 0, 'lower-chest': 0 }} {...props} />)
  })
  await vi.waitFor(() => expect(container.querySelectorAll('.bm-v')).toHaveLength(2))
  return container
}

describe('BodyMap interaction semantics', () => {
  it('keeps noninteractive maps as images without focusable muscle controls', async () => {
    await renderMap()
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(2)
    expect(container.querySelector('[role="button"]')).toBeNull()
  })

  it('exposes interactive muscles as translated pressed buttons inside groups', async () => {
    const host = await renderMap({ selected: 'upper-chest', onMuscle: vi.fn() })
    const path = host.querySelector('[data-region="upper-chest"]')
    expect(container.querySelectorAll('svg[role="group"]')).toHaveLength(2)
    expect(path).toBeTruthy()
    expect(path.tabIndex).toBe(0)
    expect(path.getAttribute('aria-pressed')).toBe('true')
  })

  it.each(['Enter', ' '])('activates upper chest once with %s', async key => {
    const onMuscle = vi.fn()
    const host = await renderMap({ onMuscle })
    const path = host.querySelector('[data-region="upper-chest"]')
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

    act(() => path.dispatchEvent(event))

    expect(onMuscle).toHaveBeenCalledTimes(1)
    expect(onMuscle).toHaveBeenCalledWith('upper-chest')
    expect(event.defaultPrevented).toBe(key === ' ')
  })

  it('paints only upper-chest at the requested load level on the front view', async () => {
    const host = await renderMap({ load: { 'upper-chest': 4, 'mid-chest': 0, 'lower-chest': 0 } })
    const front = host.querySelectorAll('.bm-v')[0]
    const upper = [...front.querySelectorAll('[data-region="upper-chest"]')]
    const mid = [...front.querySelectorAll('[data-region="mid-chest"]')]
    const lower = [...front.querySelectorAll('[data-region="lower-chest"]')]
    expect(upper.every(path => path.classList.contains('l4'))).toBe(true)
    expect(mid.every(path => path.classList.contains('l0'))).toBe(true)
    expect(lower.every(path => path.classList.contains('l0'))).toBe(true)
  })

  it('paints equal load on all chest departments at the same level', async () => {
    const host = await renderMap({ load: { 'upper-chest': 3, 'mid-chest': 3, 'lower-chest': 3 } })
    const front = host.querySelectorAll('.bm-v')[0]
    const paths = [...front.querySelectorAll('[data-region$="-chest"]')]
    expect(paths).toHaveLength(6)
    const level = [...paths[0].classList].find(c => /^l\d$/.test(c))
    expect(level).toBeTruthy()
    expect(paths.every(path => path.classList.contains(level))).toBe(true)
  })

  it('draws chest departments on the front view only', async () => {
    const host = await renderMap()
    const [front, back] = host.querySelectorAll('.bm-v')
    expect([...front.querySelectorAll('[data-region="upper-chest"]')]).toHaveLength(2)
    expect([...front.querySelectorAll('[data-region="mid-chest"]')]).toHaveLength(2)
    expect([...front.querySelectorAll('[data-region="lower-chest"]')]).toHaveLength(2)
    expect(back.querySelector('[data-region="upper-chest"]')).toBeNull()
    expect(back.querySelector('[data-region="mid-chest"]')).toBeNull()
    expect(back.querySelector('[data-region="lower-chest"]')).toBeNull()
  })

  it('paints the shin outline with the calves and selects calves from it', async () => {
    const onMuscle = vi.fn()
    await renderMap({ load: { calves: 4 }, onMuscle })
    const shins = [...container.querySelectorAll('[data-region="tibialis"]')]
    const calves = [...container.querySelectorAll('[data-region="calves"]')]
    expect(shins.length).toBeGreaterThan(0)
    expect(calves.length).toBeGreaterThan(0)
    expect(shins.every(path => path.classList.contains('l4'))).toBe(true)
    expect(calves.every(path => path.classList.contains('l4'))).toBe(true)
    expect(shins.every(path => path.getAttribute('aria-label') === 'Calves')).toBe(true)

    act(() => shins[0].dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onMuscle).toHaveBeenCalledWith('calves')
  })

  it('labels the existing legend direction for assistive technology', () => {
    act(() => root.render(<BodyMapLegend />))
    expect(container.querySelector('.hm-legend').getAttribute('aria-label')).toBe('Less More')
  })
})
