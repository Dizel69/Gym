import { describe, expect, it } from 'vitest'
import {
  enabledMeasurementFields, fromMeasurementDisplay, measurementSeries, measurementValue,
  normalizeMeasurementsState, saveGuidedMeasurements, toMeasurementDisplay,
} from './measurements.js'

describe('body measurements', () => {
  it('stores lengths in centimetres and shows inches on a pound profile', () => {
    expect(fromMeasurementDisplay(10, 'lb', { key: 'waist' })).toBe(25.4)
    expect(toMeasurementDisplay(25.4, 'lb', { key: 'waist' })).toBe(10)
    expect(fromMeasurementDisplay(80, 'kg', { key: 'waist' })).toBe(80)
  })

  it('keeps body fat as a percent and drops an impossible one', () => {
    const state = { unit: 'kg', measurements: [{ d: '2026-11-07', t: 1, bodyFat: 18.5, waist: 80 }, { d: '2026-11-07', t: 2, waist: 81 }] }
    normalizeMeasurementsState(state)
    expect(state.measurements).toHaveLength(1)
    expect(measurementValue(state.measurements[0], 'bodyFat')).toBe(18.5)
    expect(measurementValue(state.measurements[0], 'waist')).toBe(81)
    expect(fromMeasurementDisplay(140, 'kg', { key: 'bodyFat' })).toBeNull()
  })

  it('charts one field inside the chosen window', () => {
    const now = Date.parse('2026-11-07T12:00:00')
    const state = {
      unit: 'kg',
      measurements: [
        { d: '2026-08-01', t: 1, waist: 90 },
        { d: '2026-11-01', t: 2, waist: 84 },
      ],
    }
    normalizeMeasurementsState(state)
    const month = measurementSeries(state, 'waist', 30, now)
    expect(month.map(p => p.y)).toEqual([84])
    expect(measurementSeries(state, 'waist', 0, now).map(p => p.y)).toEqual([90, 84])
  })

  it('walks the places that are switched on, in the catalogue order', () => {
    const state = { unit: 'kg', measurementEnabled: ['waist', 'upperArmLeft', 'chest'], measurements: [] }
    normalizeMeasurementsState(state)
    expect(enabledMeasurementFields(state).map(f => f.key)).toEqual(['chest', 'waist', 'upperArmLeft'])
  })

  it('keeps a skipped measurement when the same day is written again', () => {
    const state = { unit: 'kg', measurements: [], customMeasurements: [{ id: 'c1', name: 'Запястье', enabled: true, unit: 'cm' }] }
    saveGuidedMeasurements(state, '2026-11-07', { chest: 102, waist: 81, 'other:c1': 16 })
    saveGuidedMeasurements(state, '2026-11-07', { waist: 80.5 })
    expect(state.measurements).toHaveLength(1)
    expect(measurementValue(state.measurements[0], 'waist')).toBe(80.5)
    expect(measurementValue(state.measurements[0], 'chest')).toBe(102)
    expect(measurementValue(state.measurements[0], 'other:c1')).toBe(16)
    expect(measurementValue(state.measurements[0], 'neck')).toBeNull()
  })
})
