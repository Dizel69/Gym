// @vitest-environment happy-dom
// A swap opens on the target muscle and leads with up to three similar exercises:
// the same movement when the catalogue has one, otherwise the same muscle and type.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { DEF, useStore } from './store/useStore.js'
import { useUI } from './store/useUI.js'
import { EXIDX } from './lib/exercises.js'
import { exercisePicker, swapActiveWorkoutExercise } from './sheets.jsx'
import { SUBSTITUTE_FAMILIES } from './lib/exercise-substitutes.js'

const mounted = []
function renderTop() {
  const sheet = useUI.getState().sheets.at(-1)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  mounted.push(root)
  act(() => root.render(sheet.render(() => useUI.getState().closeSheet(sheet.id))))
  return host
}
const chips = host => [...host.querySelectorAll('.chips .chip')]
const chipByText = (host, text) => chips(host).find(b => b.textContent.trim() === text)
const sameChip = host => chips(host).find(b => b.textContent.trim().startsWith('Same muscle'))
const isOn = el => el.className.split(/\s+/).includes('on')
const namesIn = root => [...root.querySelectorAll('.tt')].map(e => e.textContent)

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  useUI.setState({ sheets: [], toastMsg: '' })
  useStore.setState({ S: structuredClone(DEF), user: null })
  document.body.innerHTML = ''
})
afterEach(() => {
  act(() => { mounted.splice(0).forEach(root => root.unmount()) })
})

describe('swap suggestions', () => {
  it('opens a bench swap on pectorals and suggests the same press, not a fly', () => {
    const S = structuredClone(DEF)
    S.active = {
      id: 'w', d: '2026-11-09', start: Date.now(), routineId: null, name: 'Push', bw: null, cur: 0,
      entries: [{ id: '0025', target: { mode: 'reps', sets: 3, reps: 8, weight: 80 }, sets: [{ w: 80, r: 8, done: false }] }]
    }
    useStore.setState({ S, user: null })
    swapActiveWorkoutExercise(0)
    const host = renderTop()

    expect(host.querySelector('h3').textContent).toBe('Swap exercise')
    expect(host.textContent).toContain('Replacing barbell bench press')
    const chip = sameChip(host)
    expect(chip.textContent).toContain('pectorals')
    expect(isOn(chip)).toBe(true)
    expect(isOn(chipByText(host, 'All'))).toBe(false)

    const section = host.querySelector('section[aria-label="Suggested substitutes"]')
    expect(section).not.toBeNull()
    expect(section.textContent).toContain('Same movement and muscle')
    const suggested = namesIn(section)
    expect(suggested.length).toBeGreaterThan(0)
    expect(suggested.length).toBeLessThanOrEqual(3)
    const family = new Set(SUBSTITUTE_FAMILIES['flat press'].map(id => EXIDX[id].n))
    expect(suggested.every(n => family.has(n))).toBe(true)
    expect(suggested).not.toContain('barbell bench press')
    expect(suggested).not.toContain('dumbbell fly')

    const main = namesIn(host.querySelectorAll('.list')[1])
    suggested.forEach(n => expect(main.filter(x => x === n)).toHaveLength(0))
    const subtitles = [...host.querySelectorAll('.list .item .ss')].map(s => s.textContent).filter(s => s.includes(' · '))
    expect(subtitles.length).toBeGreaterThan(1)
    expect(subtitles.every(s => s.startsWith('pectorals'))).toBe(true)

    act(() => chipByText(host, 'All').click())
    expect(isOn(chipByText(host, 'All'))).toBe(true)
    const whole = [...host.querySelectorAll('.list .item .ss')].map(s => s.textContent).filter(s => s.includes(' · '))
    expect(whole.some(s => !s.startsWith('pectorals'))).toBe(true)
  })

  it('uses the same muscle and type when the movement has no family', () => {
    exercisePicker(vi.fn(), { title: 'Swap exercise', like: '5055' })
    const host = renderTop()
    expect(isOn(sameChip(host))).toBe(true)
    const section = host.querySelector('section[aria-label="Suggested substitutes"]')
    expect(section.textContent).toContain('Same muscle and exercise type. The movement may differ.')
    expect(section.querySelectorAll('.item')).toHaveLength(3)
    expect([...section.querySelectorAll('.ss')].every(s => s.textContent.startsWith('lats'))).toBe(true)
    expect(section.textContent).not.toContain('dead hang stretch')
  })

  it('an add opens on the whole list, with no same-muscle chip', () => {
    exercisePicker(vi.fn())
    const host = renderTop()
    expect(sameChip(host)).toBeUndefined()
    expect(isOn(chipByText(host, 'All'))).toBe(true)
    expect(host.querySelector('section[aria-label="Suggested substitutes"]')).toBeNull()
  })

  it('opens on All when nothing else trains that muscle', () => {
    const S = structuredClone(DEF)
    S.customEx = [{ id: 'cOnly', n: 'My odd lift', bp: 'neck', tg: 'nothing-else', eq: 'body weight', cat: 'strength', custom: true }]
    useStore.setState({ S, user: null })
    exercisePicker(vi.fn(), { like: 'cOnly' })
    const host = renderTop()
    expect(isOn(chipByText(host, 'All'))).toBe(true)
    expect(sameChip(host)).toBeUndefined()
    expect(host.querySelector('section[aria-label="Suggested substitutes"]')).toBeNull()
  })

  it('hides the suggestions while a search is typed', () => {
    exercisePicker(vi.fn(), { like: '0025', title: 'Swap exercise' })
    const host = renderTop()
    const input = host.querySelector('.search input')
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, 'fly')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(host.querySelector('section[aria-label="Suggested substitutes"]')).toBeNull()
    expect(namesIn(host)).toContain('dumbbell fly')
  })
})
