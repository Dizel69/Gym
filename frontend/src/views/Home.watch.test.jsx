// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fmtDate, fmtNum, todayISO } from '../lib/format.js'
import Home from './Home.jsx'

const mocks = vi.hoisted(() => ({
  S: {
    unit: 'kg', targetW: null, weighIn: false, checkIn: false, weekStart: 1,
    bodyweight: [], routines: [], workouts: [], dayPlan: {}, week: {}, active: null,
    healthDays: [],
  },
  user: null,
}))

vi.mock('../store/useStore.js', () => ({
  useStore: selector => selector({ S: mocks.S, user: mocks.user, update() {} }),
}))
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }))
vi.mock('../sheets.jsx', () => ({
  bwSheet: () => {}, goalSheet: () => {}, calendarSheet: () => {}, pickDayComplex: () => {},
  workoutDetailSheet: () => {}, starterPlanSheet: () => {}, bwDeltaColor: () => 'inherit',
}))

function render() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => { root.render(React.createElement(Home)) })
  return {
    text: el.textContent,
    unmount() { act(() => root.unmount()); el.remove() },
  }
}

afterEach(() => { document.body.innerHTML = '' })

describe('watch card on Home', () => {
  it('stays hidden when import is off and nothing has been saved', () => {
    mocks.S.healthDays = []
    mocks.S.healthImport = false
    const view = render()
    expect(view.text).not.toContain('From the watch')
    view.unmount()
    mocks.S.healthImport = true
  })

  it('keeps saved numbers on Home when import is switched off', () => {
    mocks.S.healthImport = false
    mocks.S.healthDays = [{ d: todayISO(), steps: 8420, sleepMin: 452, activeKcal: 310 }]
    const view = render()
    expect(view.text).toContain('From the watch')
    expect(view.text).toContain('7 h 32 min')
    view.unmount()
    mocks.S.healthImport = true
  })

  it('stays hidden on the website until the phone has synced a day', () => {
    mocks.S.healthDays = []
    const view = render()
    expect(view.text).not.toContain('From the watch')
    view.unmount()
  })

  it('shows today\'s steps, sleep and active calories', () => {
    mocks.S.healthDays = [{ d: todayISO(), steps: 8420, sleepMin: 452, activeKcal: 310 }]
    const view = render()
    expect(view.text).toContain('From the watch')
    expect(view.text).toContain(fmtNum(8420))
    expect(view.text).toContain('7 h 32 min')
    expect(view.text).toContain(fmtNum(310))
    expect(view.text).toContain('Workouts are not imported')
    view.unmount()
  })

  it('shows the latest day, with its date, when today has not arrived yet', () => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    const iso = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0')
    mocks.S.healthDays = [{ d: iso, steps: 5000, sleepMin: 400, activeKcal: 200 }]
    const view = render()
    expect(view.text).toContain(fmtDate(iso, true))
    expect(view.text).toContain('6 h 40 min')
    view.unmount()
  })
})
