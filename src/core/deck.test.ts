import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDeck, mountDeck, slideElements } from '../test-utils'
import type { DeckEvents } from '../types'
import { createDeck } from './deck'

const threeSlides = [
  { id: 'a', title: 'Alpha' },
  {
    id: 'b',
    title: 'Beta',
    html: '<p data-step>one</p><p data-step>two</p>',
  },
  { id: 'c', title: 'Gamma' },
]

/** A fake animation whose `finished` promise the test controls. */
const fakeAnimation = () => {
  let resolve = () => {}
  const finished = new Promise<void>((done) => {
    resolve = done
  })
  const animation = {
    finished,
    finish: vi.fn(() => resolve()),
    resolve: () => resolve(),
  }
  return animation
}

const mockAnimations = (animations: readonly object[]) =>
  vi
    .spyOn(HTMLElement.prototype, 'getAnimations')
    // The core only reads `finished` and calls `finish()`.
    .mockReturnValue(animations as Animation[])

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.head.innerHTML = ''
})

describe('createDeck', () => {
  it('writes slide semantics and initial state', () => {
    const deck = makeDeck(threeSlides)
    const [a, b, c] = slideElements(deck.root)
    expect(deck.root.getAttribute('aria-roledescription')).toBe('slide deck')
    expect(deck.root.getAttribute('tabindex')).toBe('-1')
    expect(deck.root.dataset.index).toBe('1')
    expect(deck.root.dataset.count).toBe('3')
    expect(deck.root.style.getPropertyValue('--deck-width')).toBe('1600px')
    expect(deck.root.style.getPropertyValue('--deck-progress')).toBe('0')
    expect(a?.getAttribute('role')).toBe('group')
    expect(a?.getAttribute('aria-roledescription')).toBe('slide')
    expect(b?.getAttribute('aria-label')).toBe('2 of 3: Beta')
    expect(a?.dataset.state).toBe('active')
    expect(a?.getAttribute('aria-current')).toBe('true')
    expect(b?.dataset.state).toBe('future')
    expect(b?.hasAttribute('inert')).toBe(true)
    expect(c?.style.getPropertyValue('--slide-index')).toBe('3')
    expect(document.querySelector('style[data-deck-styles]')).not.toBeNull()
  })

  it('does not inject styles with injectStyles: false', () => {
    makeDeck(threeSlides, { injectStyles: false })
    expect(document.querySelector('style[data-deck-styles]')).toBeNull()
  })

  it('reveals steps, then moves on, and back again', () => {
    const deck = makeDeck(threeSlides)
    const steps = [...deck.root.querySelectorAll<HTMLElement>('[data-step]')]
    deck.next()
    expect(deck.index).toBe(1)
    expect(steps.map((step) => step.dataset.stepState)).toEqual([
      'hidden',
      'hidden',
    ])
    expect(steps[0]?.getAttribute('aria-hidden')).toBe('true')
    expect(steps[0]?.hasAttribute('inert')).toBe(true)
    deck.next()
    deck.next()
    expect(steps.map((step) => step.dataset.stepState)).toEqual([
      'visible',
      'current',
    ])
    expect(steps[0]?.hasAttribute('aria-hidden')).toBe(false)
    expect(steps[1]?.style.getPropertyValue('--step-index')).toBe('2')
    deck.next()
    expect(deck.index).toBe(2)
    expect(steps.map((step) => step.dataset.stepState)).toEqual([
      'visible',
      'visible',
    ])
    deck.prev()
    expect(deck.index).toBe(1)
    expect(deck.step).toBe(2)
    deck.prev()
    expect(deck.step).toBe(1)
  })

  it('opens slides by index or id and clamps', () => {
    const deck = makeDeck(threeSlides)
    deck.go('c')
    expect(deck.index).toBe(2)
    deck.go('missing')
    expect(deck.index).toBe(2)
    deck.go(Number.NaN)
    expect(deck.index).toBe(2)
    deck.go(-5)
    expect(deck.index).toBe(0)
    deck.go(1, { step: 'all' })
    expect(deck.step).toBe(2)
    deck.last()
    expect(deck.index).toBe(2)
    deck.first()
    expect(deck.index).toBe(0)
    expect(deck.root.dataset.direction).toBe('backward')
  })

  it('emits change, step, and settled', () => {
    const deck = makeDeck(threeSlides)
    const events: string[] = []
    const changes: DeckEvents['change'][] = []
    deck.on('change', (payload) => {
      events.push('change')
      changes.push(payload)
    })
    deck.on('step', () => events.push('step'))
    deck.on('settled', () => events.push('settled'))
    deck.next()
    deck.next()
    deck.next()
    deck.next()
    expect(events).toEqual([
      'change',
      'settled',
      'change',
      'step',
      'change',
      'step',
      'change',
      'settled',
    ])
    expect(changes[0]).toEqual({
      index: 1,
      step: 0,
      previousIndex: 0,
      previousStep: 0,
      direction: 'forward',
    })
  })

  it('announces only slide changes in its own live region', () => {
    const deck = makeDeck(threeSlides)
    const live = document.querySelector('[data-deck-live]')
    expect(live?.getAttribute('aria-live')).toBe('polite')
    expect(deck.root.hasAttribute('aria-live')).toBe(false)
    deck.next()
    expect(live?.textContent).toBe('Slide 2 of 3: Beta')
    deck.next()
    expect(live?.textContent).toBe('Slide 2 of 3: Beta')
  })

  it('moves focus to the root when focus would end up in inert content', () => {
    const deck = makeDeck([
      { title: 'One', html: '<button id="btn">Go</button>' },
      { title: 'Two' },
    ])
    const button = document.getElementById('btn')
    button?.focus()
    expect(document.activeElement).toBe(button)
    deck.next()
    expect(document.activeElement).toBe(deck.root)
  })

  it('keeps focus that is outside the deck', () => {
    const deck = makeDeck(threeSlides)
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    deck.next()
    expect(document.activeElement).toBe(outside)
  })

  it('handles modes and shows every step in overview', () => {
    const deck = makeDeck(threeSlides)
    const modes: DeckEvents['mode'][] = []
    deck.on('mode', (payload) => modes.push(payload))
    deck.toggleMode('overview')
    deck.setMode('overview', true)
    expect(deck.mode('overview')).toBe(true)
    expect(modes).toEqual([{ name: 'overview', on: true }])
    expect(deck.root.hasAttribute('data-mode-overview')).toBe(true)
    const slides = slideElements(deck.root)
    expect(slides.some((slide) => slide.hasAttribute('inert'))).toBe(false)
    const states = [
      ...deck.root.querySelectorAll<HTMLElement>('[data-step]'),
    ].map((step) => step.dataset.stepState)
    expect(states).toEqual(['visible', 'visible'])
    deck.next()
    expect(deck.index).toBe(1)
    deck.next()
    expect(deck.index).toBe(2)
    deck.prev()
    expect(deck.index).toBe(1)
    deck.toggleMode('overview')
    expect(deck.root.hasAttribute('data-mode-overview')).toBe(false)
  })

  it('reports progress 1 for a one-slide deck', () => {
    const deck = makeDeck([{ title: 'Only' }])
    expect(deck.root.style.getPropertyValue('--deck-progress')).toBe('1')
    deck.next()
    deck.prev()
    expect(deck.index).toBe(0)
  })

  it('runs and removes commands and plugins', () => {
    const deck = makeDeck(threeSlides)
    deck.run('next')
    deck.run('unknown')
    expect(deck.index).toBe(1)
    const cleanup = vi.fn()
    const remove = deck.use(() => cleanup)
    remove()
    remove()
    expect(cleanup).toHaveBeenCalledTimes(1)
    deck.use(() => undefined)()
  })

  it('restores the page on destroy', () => {
    const root = mountDeck(threeSlides)
    const before = root.outerHTML
    const cleanup = vi.fn()
    const deck = createDeck(root, { plugins: [() => cleanup], warnings: false })
    deck.next()
    deck.setMode('notes', true)
    deck.destroy()
    deck.destroy()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(root.outerHTML).toBe(before)
    expect(document.querySelector('[data-deck-live]')).toBeNull()
    expect(document.querySelector('style[data-deck-styles]')).toBeNull()
    deck.next()
    deck.setMode('overview', true)
    expect(deck.use(() => cleanup)).toBeTypeOf('function')
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('warns once, only when warnings are on', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const quiet = makeDeck(threeSlides)
    quiet.warn('hidden')
    expect(warn).not.toHaveBeenCalled()
    const loud = makeDeck(threeSlides, { warnings: true })
    loud.warn('shown')
    loud.warn('shown')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('[plainslides] shown')
  })
})

describe('slide transitions', () => {
  it('skips the transition without a name or with none', () => {
    const deck = makeDeck([
      { title: 'One' },
      { title: 'Two', attrs: { 'data-transition': 'none' } },
    ])
    const settled = vi.fn()
    deck.on('settled', settled)
    deck.next()
    expect(deck.root.hasAttribute('data-transitioning')).toBe(false)
    expect(settled).toHaveBeenCalledWith({ index: 1 })
  })

  it('sets transition attributes and waits for animations', async () => {
    const animation = fakeAnimation()
    mockAnimations([animation])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    const [a, b] = slideElements(deck.root)
    const settled = vi.fn()
    deck.on('settled', settled)
    deck.next()
    expect(deck.transitioning).toBe(true)
    expect(deck.root.hasAttribute('data-transitioning')).toBe(true)
    expect(a?.dataset.leaving).toBe('fade')
    expect(a?.hasAttribute('inert')).toBe(true)
    expect(b?.dataset.entering).toBe('fade')
    expect(b?.dataset.state).toBe('active')
    expect(settled).not.toHaveBeenCalled()
    animation.resolve()
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith({ index: 1 }))
    expect(deck.transitioning).toBe(false)
    expect(a?.hasAttribute('data-leaving')).toBe(false)
    expect(b?.hasAttribute('data-entering')).toBe(false)
  })

  it('uses the slide name over the root name', () => {
    mockAnimations([fakeAnimation()])
    const deck = makeDeck(
      [
        { title: 'One' },
        { title: 'Two', attrs: { 'data-transition': 'zoom' } },
      ],
      {},
      { 'data-transition': 'fade' },
    )
    deck.next()
    expect(slideElements(deck.root)[1]?.dataset.entering).toBe('zoom')
  })

  it('finishes a running transition on fast input', () => {
    const first = fakeAnimation()
    mockAnimations([first])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    const settled = vi.fn()
    deck.on('settled', settled)
    deck.next()
    deck.next()
    expect(first.finish).toHaveBeenCalled()
    expect(settled).toHaveBeenCalledWith({ index: 1 })
    expect(deck.step).toBe(1)
    expect(slideElements(deck.root)[0]?.hasAttribute('data-leaving')).toBe(
      false,
    )
  })

  it('survives animations that cannot finish', () => {
    const endless = {
      finished: new Promise(() => undefined),
      finish: () => {
        throw new Error('InvalidStateError')
      },
    }
    mockAnimations([endless])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    deck.next()
    deck.go(2)
    expect(deck.index).toBe(2)
  })

  it('ends a stuck transition after the timeout', () => {
    vi.useFakeTimers()
    mockAnimations([{ finished: new Promise(() => undefined), finish() {} }])
    const deck = makeDeck(
      threeSlides,
      { transitionTimeout: 200 },
      { 'data-transition': 'fade' },
    )
    deck.next()
    expect(deck.transitioning).toBe(true)
    vi.advanceTimersByTime(200)
    expect(deck.transitioning).toBe(false)
    expect(deck.root.hasAttribute('data-transitioning')).toBe(false)
  })

  it('does not report a transition when no animation runs', () => {
    mockAnimations([])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    deck.next()
    expect(deck.transitioning).toBe(false)
    expect(deck.root.hasAttribute('data-transitioning')).toBe(false)
  })

  it('keeps a running transition when the same position is requested again', () => {
    const animation = fakeAnimation()
    mockAnimations([animation])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    deck.next()
    deck.go(1)
    expect(animation.finish).not.toHaveBeenCalled()
    expect(deck.transitioning).toBe(true)
  })

  it('ignores looping animations', () => {
    mockAnimations([
      {
        finished: new Promise(() => undefined),
        finish() {},
        effect: { getComputedTiming: () => ({ iterations: Infinity }) },
      },
    ])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    deck.next()
    expect(deck.transitioning).toBe(false)
  })

  it('warns when a named transition runs no animation', () => {
    mockAnimations([])
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const deck = makeDeck(
      threeSlides,
      { warnings: true },
      { 'data-transition': 'fade' },
    )
    deck.next()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Transition "fade" runs no animation'),
    )
  })

  it('does not warn under reduced motion', () => {
    mockAnimations([])
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const deck = makeDeck(
      threeSlides,
      { warnings: true },
      { 'data-transition': 'fade' },
    )
    deck.next()
    expect(warn).not.toHaveBeenCalled()
  })

  it('skips transitions with transition: false and in overview', () => {
    mockAnimations([fakeAnimation()])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    deck.go(1, { transition: false })
    expect(deck.transitioning).toBe(false)
    deck.setMode('overview', true)
    deck.go(2)
    expect(deck.transitioning).toBe(false)
  })

  it('finishes a running transition when print mode starts', () => {
    const animation = fakeAnimation()
    mockAnimations([animation])
    const deck = makeDeck(threeSlides, {}, { 'data-transition': 'fade' })
    deck.next()
    deck.setMode('print', true)
    expect(animation.finish).toHaveBeenCalled()
    expect(deck.transitioning).toBe(false)
  })
})

describe('validate', () => {
  it('reports authoring problems', () => {
    const deck = makeDeck(
      [
        {
          html: '<p data-step="x"></p><img src="a.png"><figure></figure>',
          attrs: { 'data-duration': 'soon' },
        },
        {
          title: 'Two',
          html: '<h1>A</h1><h1>B</h1><div data-layout="weird"></div><ol><li data-deck-tracker-item="Nope"></li></ol>',
        },
      ],
      {},
      { 'data-width': 'wide' },
    )
    deck.keymap.bind('n', 'next')
    deck.keymap.bind('n', 'prev')
    const codes = deck.validate().map((issue) => issue.code)
    expect(codes).toEqual([
      'size',
      'slide-title',
      'duration',
      'step-value',
      'h1-count',
      'layout',
      'tracker-item',
      'figure-name',
      'img-alt',
      'key-conflict',
    ])
  })

  it('reports an empty deck and runs added checks', () => {
    const deck = makeDeck([])
    const remove = deck.addCheck(() => [{ code: 'custom', message: 'x' }])
    expect(deck.validate().map((issue) => issue.code)).toEqual([
      'no-slides',
      'custom',
    ])
    remove()
    expect(deck.validate()).toHaveLength(1)
    deck.next()
    expect(deck.index).toBe(0)
  })

  it('accepts a valid deck', () => {
    const deck = makeDeck([
      {
        title: 'One',
        attrs: { 'data-duration': '30', 'data-section': 'Intro' },
        html: '<figure aria-label="Chart"></figure><img alt=""><div data-layout="row"></div><ol><li data-deck-tracker-item="Intro"></li></ol>',
      },
    ])
    expect(deck.validate()).toEqual([])
  })
})
