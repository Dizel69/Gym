import { describe, expect, it } from 'vitest'
import paths from './body-paths.js'
import { chestDepartmentsFor, chestPieces, CHEST_DEPARTMENTS } from './chest-regions.js'

function seamEnds(seamD) {
  const nums = seamD.replace(/[MQZ]/gi, ' ').trim().split(/\s+/).map(Number)
  const yMed = nums.at(-1)
  const yLat = nums[1]
  const xLat = nums[0]
  const xMed = nums.at(-2)
  return { xLat, yLat, xMed, yMed }
}

describe('chest-regions', () => {
  it.each(['male', 'female'])('%s front yields two pecs with three departments each', body => {
    const pecs = chestDepartmentsFor(paths[body].front)
    expect(pecs).toHaveLength(2)
    for (const pec of pecs) {
      for (const dept of CHEST_DEPARTMENTS) {
        expect(pec.clips[dept]).toMatch(/^M/)
        expect(pec.clips[dept]).not.toEqual(pec.outline)
      }
    }
  })

  it.each(['male', 'female'])('%s back yields no chest departments', body => {
    expect(chestDepartmentsFor(paths[body].back)).toEqual([])
    expect(chestPieces(paths)[body].back).toEqual([])
  })

  it('places the upper seam medial end higher than the lower seam on every pec', () => {
    for (const body of ['male', 'female']) {
      for (const pec of chestDepartmentsFor(paths[body].front)) {
        const upper = seamEnds(pec.seams.upper)
        const lower = seamEnds(pec.seams.lower)
        expect(upper.yMed).toBeLessThan(lower.yMed)
      }
    }
  })

  it('draws curved seams that move in x and y', () => {
    for (const body of ['male', 'female']) {
      for (const pec of chestDepartmentsFor(paths[body].front)) {
        for (const key of ['upper', 'lower']) {
          const { xLat, yLat, xMed, yMed } = seamEnds(pec.seams[key])
          expect(Math.abs(xMed - xLat)).toBeGreaterThan(8)
          expect(Math.abs(yMed - yLat)).toBeGreaterThan(8)
        }
        expect(pec.clips['upper-chest']).not.toBe(pec.clips['lower-chest'])
      }
    }
  })

  it('gives each seam its own lateral height on every pec', () => {
    for (const body of ['male', 'female']) {
      for (const pec of chestDepartmentsFor(paths[body].front)) {
        const upper = seamEnds(pec.seams.upper)
        const lower = seamEnds(pec.seams.lower)
        const h = pec.bbox.maxY - pec.bbox.minY
        expect(Math.abs(upper.yLat - lower.yLat)).toBeGreaterThan(h * 0.25)
      }
    }
  })

  it('makes mid-chest the tallest band at the sternum', () => {
    for (const body of ['male', 'female']) {
      for (const pec of chestDepartmentsFor(paths[body].front)) {
        const upper = seamEnds(pec.seams.upper)
        const lower = seamEnds(pec.seams.lower)
        const { minY, maxY } = pec.bbox
        const midSpan = lower.yMed - upper.yMed
        const upperSpan = upper.yMed - minY
        const lowerSpan = maxY - lower.yMed
        expect(midSpan).toBeGreaterThan(upperSpan)
        expect(midSpan).toBeGreaterThan(lowerSpan)
      }
    }
  })
})
