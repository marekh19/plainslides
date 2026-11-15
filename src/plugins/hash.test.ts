import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSlides } from '../core/registry'
import { makeDeck, mountDeck } from '../test-utils'
import { formatHash, hash, parseHash } from './hash'

const specs = [
  { id: 'intro', title: 'Intro' },
  { title: 'Two', html: '<p data-step></p><p data-step></p>' },
  { id: 'v1.2', title: 'Version' },
]

afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(null, '', '#')
})

describe('parseHash', () => {
  const slides = buildSlides(mountDeck(specs))

  it('reads numbers, ids, and step suffixes', () => {
    expect(parseHash('#2', slides)).toEqual({ index: 1, step: 0 })
    expect(parseHash('#2.1', slides)).toEqual({ index: 1, step: 1 })
    expect(parseHash('#intro', slides)).toEqual({ index: 0, step: 0 })
    expect(parseHash('#intro.3', slides)).toEqual({ index: 0, step: 3 })
    expect(parseHash('#v1.2', slides)).toEqual({ index: 2, step: 0 })
    expect(parseHash('#v1.2.1', slides)).toEqual({ index: 2, step: 1 })
  })

  it('ignores empty, unknown, and broken hashes', () => {
    expect(parseHash('', slides)).toBeUndefined()
    expect(parseHash('#', slides)).toBeUndefined()
    expect(parseHash('#nope', slides)).toBeUndefined()
    expect(parseHash('#0', slides)).toBeUndefined()
    expect(parseHash('#%E0%A4%A', slides)).toBeUndefined()
  })
})

describe('formatHash', () => {
  it('uses the id or the 1-based number', () => {
    const slides = buildSlides(mountDeck(specs))
    expect(slides.map((slide) => formatHash(slide, 0))).toEqual([
      '#intro',
      '#2',
      '#v1.2',
    ])
    const second = slides[1]
    if (!second) throw new Error('Missing slide')
    expect(formatHash(second, 2)).toBe('#2.2')
  })
})

describe('hash plugin', () => {
  it('opens the slide from the hash and writes changes', () => {
    history.replaceState(null, '', '#2.1')
    const deck = makeDeck(specs, { plugins: [hash()] })
    expect(deck.index).toBe(1)
    expect(deck.step).toBe(1)
    deck.next()
    expect(location.hash).toBe('#2.2')
    deck.next()
    expect(location.hash).toBe('#v1.2')
  })

  it('normalizes the hash on load and follows hash changes', () => {
    history.replaceState(null, '', '#1')
    const deck = makeDeck(specs, { plugins: [hash()] })
    expect(location.hash).toBe('#intro')
    history.replaceState(null, '', '#3')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(deck.index).toBe(2)
    history.replaceState(null, '', '#2')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(deck.index).toBe(1)
    deck.destroy()
  })

  it('pushes history entries when asked', () => {
    const push = vi.spyOn(history, 'pushState')
    const deck = makeDeck(specs, { plugins: [hash({ history: 'push' })] })
    deck.next()
    expect(push).toHaveBeenCalledWith(null, '', '#2')
  })

  it('falls back to location.replace when history is blocked', () => {
    vi.spyOn(history, 'replaceState').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const replace = vi
      .spyOn(location, 'replace')
      .mockImplementation(() => undefined)
    makeDeck(specs, { plugins: [hash()] })
    expect(replace).toHaveBeenCalledWith('#intro')
  })
})
