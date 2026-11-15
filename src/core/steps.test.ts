import { describe, expect, it } from 'vitest'
import { collectStepGroups, isIntegerStep, stepState } from './steps'

const groupsOf = (html: string) => {
  const slide = document.createElement('section')
  slide.innerHTML = html
  return collectStepGroups(slide).map((group) =>
    group.map((element) => element.id),
  )
}

describe('collectStepGroups', () => {
  it('uses document order for steps without a value', () => {
    expect(
      groupsOf('<p id="a" data-step></p><p id="b" data-step></p>'),
    ).toEqual([['a'], ['b']])
  })

  it('groups equal values and sorts by value', () => {
    expect(
      groupsOf(
        '<p id="a" data-step="2"></p><p id="b" data-step="1"></p><p id="c" data-step="2"></p>',
      ),
    ).toEqual([['b'], ['a', 'c']])
  })

  it('numbers a step without a value after the highest number before it', () => {
    expect(
      groupsOf(
        '<p id="a" data-step></p><p id="b" data-step="5"></p><p id="c" data-step></p><p id="d" data-step="1"></p>',
      ),
    ).toEqual([['a', 'd'], ['b'], ['c']])
  })

  it('treats a non-integer value like a missing value', () => {
    expect(
      groupsOf('<p id="a" data-step="x"></p><p id="b" data-step="1"></p>'),
    ).toEqual([['a', 'b']])
  })

  it('includes nested steps', () => {
    expect(
      groupsOf('<div id="a" data-step><p id="b" data-step></p></div>'),
    ).toEqual([['a'], ['b']])
  })
})

describe('isIntegerStep', () => {
  it('accepts empty values and integers', () => {
    expect(isIntegerStep('')).toBe(true)
    expect(isIntegerStep(' 3 ')).toBe(true)
    expect(isIntegerStep('-1')).toBe(true)
    expect(isIntegerStep('1.5')).toBe(false)
    expect(isIntegerStep('first')).toBe(false)
  })
})

describe('stepState', () => {
  it('marks the latest revealed group as current', () => {
    expect([0, 1, 2].map((group) => stepState(group, 2))).toEqual([
      'visible',
      'current',
      'hidden',
    ])
    expect(stepState(0, 0)).toBe('hidden')
  })
})
