import { describe, expect, it } from 'vitest'
import {
  directionOf,
  nextPosition,
  prevPosition,
  progressOf,
  resolve,
} from './navigation'

const counts = [0, 2, 1]

describe('resolve', () => {
  it('clamps the index and the step', () => {
    expect(resolve(counts, -3)).toEqual({ index: 0, step: 0 })
    expect(resolve(counts, 9)).toEqual({ index: 2, step: 0 })
    expect(resolve(counts, 1, 7)).toEqual({ index: 1, step: 2 })
    expect(resolve(counts, 1, 'all')).toEqual({ index: 1, step: 2 })
  })

  it('treats a step that is not a number as 0', () => {
    expect(resolve(counts, 1, Number.NaN)).toEqual({ index: 1, step: 0 })
  })

  it('handles an empty deck', () => {
    expect(resolve([], 4)).toEqual({ index: 0, step: 0 })
  })
})

describe('nextPosition and prevPosition', () => {
  it('reveals steps before moving to the next slide', () => {
    const path = [{ index: 0, step: 0 }]
    for (let i = 0; i < 5; i++) {
      const last = path.at(-1) ?? { index: 0, step: 0 }
      path.push(nextPosition(counts, last))
    }
    expect(path).toEqual([
      { index: 0, step: 0 },
      { index: 1, step: 0 },
      { index: 1, step: 1 },
      { index: 1, step: 2 },
      { index: 2, step: 0 },
      { index: 2, step: 1 },
    ])
    expect(nextPosition(counts, { index: 2, step: 1 })).toEqual({
      index: 2,
      step: 1,
    })
  })

  it('hides steps, then opens the previous slide with all steps', () => {
    expect(prevPosition(counts, { index: 2, step: 1 })).toEqual({
      index: 2,
      step: 0,
    })
    expect(prevPosition(counts, { index: 2, step: 0 })).toEqual({
      index: 1,
      step: 2,
    })
    expect(prevPosition(counts, { index: 0, step: 0 })).toEqual({
      index: 0,
      step: 0,
    })
  })
})

describe('directionOf', () => {
  it('compares slides first, then steps', () => {
    expect(directionOf({ index: 1, step: 0 }, { index: 2, step: 0 })).toBe(
      'forward',
    )
    expect(directionOf({ index: 2, step: 0 }, { index: 1, step: 3 })).toBe(
      'backward',
    )
    expect(directionOf({ index: 1, step: 2 }, { index: 1, step: 1 })).toBe(
      'backward',
    )
  })
})

describe('progressOf', () => {
  it('returns 1 for a one-slide deck instead of dividing by zero', () => {
    expect(progressOf(0, 1)).toBe(1)
    expect(progressOf(0, 0)).toBe(1)
    expect(progressOf(1, 3)).toBe(0.5)
  })
})
