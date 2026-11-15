import { describe, expect, it } from 'vitest'
import { mountDeck } from '../test-utils'
import { buildSections, buildSlides, positive, resolveSize } from './registry'

describe('positive', () => {
  it('accepts only positive finite numbers', () => {
    expect(positive('45')).toBe(45)
    expect(positive('0')).toBeUndefined()
    expect(positive('-3')).toBeUndefined()
    expect(positive('abc')).toBeUndefined()
    expect(positive('')).toBeUndefined()
    expect(positive(undefined)).toBeUndefined()
  })
})

describe('resolveSize', () => {
  it('prefers options, then root attributes, then 1600x900', () => {
    const root = document.createElement('main')
    expect(resolveSize(root, {})).toEqual({ width: 1600, height: 900 })
    root.dataset.width = '1920'
    root.dataset.height = 'bad'
    expect(resolveSize(root, {})).toEqual({ width: 1920, height: 900 })
    expect(resolveSize(root, { width: 1280, height: 720 })).toEqual({
      width: 1280,
      height: 720,
    })
  })
})

describe('buildSlides', () => {
  it('reads titles with fallbacks', () => {
    const root = mountDeck([
      { attrs: { 'data-title': 'Given' }, title: 'Heading' },
      { title: 'Heading' },
      { html: '<p data-role="eyebrow">Eyebrow</p>' },
      { html: '<aside data-notes><h2>Notes heading</h2></aside>' },
    ])
    expect(buildSlides(root).map((slide) => slide.title)).toEqual([
      'Given',
      'Heading',
      'Eyebrow',
      'Slide 4',
    ])
  })

  it('reads metadata and ignores non-slide children', () => {
    const root = mountDeck([
      {
        id: 'intro',
        attrs: {
          'data-duration': '30',
          'data-section': 'A',
          'data-subsection': 'B',
          'data-transition': 'fade',
        },
        html: '<aside data-notes>Hi</aside><p data-step></p>',
      },
    ])
    root.append(document.createElement('div'))
    const [slide] = buildSlides(root)
    expect(slide).toMatchObject({
      index: 0,
      id: 'intro',
      duration: 30,
      section: 'A',
      subsection: 'B',
      transition: 'fade',
    })
    expect(slide?.notes?.textContent).toBe('Hi')
    expect(slide?.stepGroups).toHaveLength(1)
    expect(buildSlides(root)).toHaveLength(1)
  })
})

describe('buildSections', () => {
  it('groups slides by section and subsection', () => {
    const root = mountDeck([
      { attrs: { 'data-section': 'Intro' } },
      { attrs: { 'data-section': 'Body', 'data-subsection': 'One' } },
      { attrs: { 'data-section': 'Body', 'data-subsection': 'Two' } },
      { attrs: { 'data-section': 'Body', 'data-subsection': 'Two' } },
      {},
    ])
    expect(buildSections(buildSlides(root))).toEqual([
      { name: 'Intro', start: 0, end: 0, subsections: [] },
      {
        name: 'Body',
        start: 1,
        end: 3,
        subsections: [
          { name: 'One', start: 1, end: 1 },
          { name: 'Two', start: 2, end: 3 },
        ],
      },
    ])
  })
})
