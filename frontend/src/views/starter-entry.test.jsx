// @vitest-environment happy-dom
// Home and Plan both offer the starter plan to someone who has no routines yet. Both used to
// wire the button straight to the loader, which quietly handed the click event in as the plan
// id and loaded nothing at all — so both entry points are pinned here.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useStore } from '../store/useStore.js'
import { starterPlanSheet } from '../sheets.jsx'
import Home from './Home.jsx'
import Plan from './Plan.jsx'

vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  starterPlanSheet: vi.fn(), bwSheet: vi.fn(), goalSheet: vi.fn(), dayOverrideSheet: vi.fn(),
  calendarSheet: vi.fn(), startFlow: vi.fn(), bwDeltaColor: () => '',
  dayAssignSheet: vi.fn(), planToolsSheet: vi.fn(),
}))

let host, root
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  starterPlanSheet.mockClear()
  useStore.setState(s => ({ S: { ...s.S, routines: [], week: {}, active: null }, user: null }))
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const starterButton = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Load starter plan')

describe('Home empty state', () => {
  it('opens the starter plan chooser instead of loading one plan blind', () => {
    act(() => root.render(<Home />))
    const button = starterButton()
    expect(button).toBeTruthy()

    act(() => { button.click() })
    expect(starterPlanSheet).toHaveBeenCalledTimes(1)
  })

  it('drops the offer once the user has routines', () => {
    useStore.setState(s => ({ S: { ...s.S, routines: [{ id: 'r', name: 'Mine', emoji: 'star', ex: [] }] } }))
    act(() => root.render(<Home />))
    expect(starterButton()).toBeFalsy()
  })
})

describe('Plan empty state', () => {
  it('offers an empty complex library instead of a starter plan', () => {
    act(() => root.render(<Plan />))
    expect(host.textContent).toContain('No complexes yet.')
    expect(starterButton()).toBeFalsy()
    expect(starterPlanSheet).not.toHaveBeenCalled()
  })

  it('lists a saved complex once one exists', () => {
    useStore.setState(s => ({ S: { ...s.S, routines: [{ id: 'r', name: 'Mine', emoji: 'star', ex: [] }] } }))
    act(() => root.render(<Plan />))
    expect(host.textContent).toContain('Mine')
    expect(host.textContent).not.toContain('No complexes yet.')
  })
})
