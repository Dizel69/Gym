import { describe, expect, it } from 'vitest'
import paths from './body-paths.js'
import { pointsOf, tapeFor } from './measure-outline.js'

describe('measurement tape on the body outline', () => {
  it('reads a curve as the points the tape is placed from', () => {
    expect(pointsOf('M10 10 C20 0 30 0 40 10')).toEqual([[10, 10], [20, 0], [30, 0], [40, 10]])
    expect(pointsOf('M0 0a.52.52 0 01.81.1').at(-1)).toEqual([0.81, 0.1])
    expect(pointsOf('M0 0a1.03 1.02-17.9 011.67.85').at(-1)).toEqual([1.67, 0.85])
  })

  it('puts the chest between the neck and the waist, and the left arm on the right of the picture', () => {
    const front = paths.male.front
    const neck = tapeFor(front, 'neck')
    const chest = tapeFor(front, 'chest')
    const waist = tapeFor(front, 'waist')
    const hips = tapeFor(front, 'hips')
    expect(neck.cy).toBeLessThan(chest.cy)
    expect(chest.cy).toBeLessThan(waist.cy)
    expect(waist.cy).toBeLessThan(hips.cy)
    expect(tapeFor(front, 'upperArmLeft').cx).toBeGreaterThan(tapeFor(front, 'upperArmRight').cx)
    expect(tapeFor(front, 'thighLeft').cx).toBeGreaterThan(tapeFor(front, 'thighRight').cx)
  })

  it('places the same measurements on the female outline', () => {
    const front = paths.female.front
    const chest = tapeFor(front, 'chest')
    const waist = tapeFor(front, 'waist')
    expect(chest.cy).toBeLessThan(waist.cy)
    expect(tapeFor(front, 'upperArmLeft').cx).toBeGreaterThan(tapeFor(front, 'upperArmRight').cx)
    expect(tapeFor(front, 'bodyFat')).toBeNull()
  })
})