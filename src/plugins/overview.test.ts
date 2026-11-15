import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDeck, slideElements } from '../test-utils'
import { overview } from './overview'

const specs = [{ title: 'One' }, { title: 'Two' }, { title: 'Three' }]

const media = (matches: boolean) => {
  const listeners: (() => void)[] = []
  const query = {
    matches,
    addEventListener: (_type: string, listener: () => void) =>
      listeners.push(listener),
    removeEventListener: vi.fn(),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(
    // The plugin only reads `matches` and listens for `change`.
    query as unknown as MediaQueryList,
  )
  return {
    set(value: boolean) {
      query.matches = value
      listeners.forEach((listener) => listener())
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('overview', () => {
  it('turns slides into focusable buttons and restores them', () => {
    const deck = makeDeck(specs, { plugins: [overview({ auto: false })] })
    const slides = slideElements(deck.root)
    deck.run('overview')
    expect(deck.mode('overview')).toBe(true)
    expect(
      slides.every((slide) => slide.getAttribute('tabindex') === '0'),
    ).toBe(true)
    expect(slides[0]?.getAttribute('role')).toBe('button')
    expect(slides[0]?.hasAttribute('aria-roledescription')).toBe(false)
    expect(slides[0]?.querySelector('h2')?.hasAttribute('inert')).toBe(true)
    expect(document.activeElement).toBe(slides[0])
    deck.next()
    expect(document.activeElement).toBe(slides[1])
    deck.run('overview')
    expect(slides[0]?.hasAttribute('tabindex')).toBe(false)
    expect(slides[0]?.getAttribute('role')).toBe('group')
    expect(slides[0]?.getAttribute('aria-roledescription')).toBe('slide')
    expect(slides[0]?.querySelector('h2')?.hasAttribute('inert')).toBe(false)
    expect(document.activeElement).toBe(deck.root)
  })

  it('opens a slide on click, Enter, or Space', () => {
    const deck = makeDeck(specs, { plugins: [overview({ auto: false })] })
    const slides = slideElements(deck.root)
    deck.setMode('overview', true)
    slides[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(deck.index).toBe(2)
    expect(deck.mode('overview')).toBe(false)

    deck.setMode('overview', true)
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    slides[1]?.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(true)
    expect(deck.index).toBe(1)

    deck.setMode('overview', true)
    slides[0]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true }),
    )
    deck.root.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(deck.mode('overview')).toBe(true)
  })

  it('ignores clicks and keys outside overview', () => {
    const deck = makeDeck(specs, { plugins: [overview({ auto: false })] })
    slideElements(deck.root)[2]?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    slideElements(deck.root)[2]?.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
    expect(deck.index).toBe(0)
  })

  it('follows the media query', () => {
    const query = media(true)
    const deck = makeDeck(specs, { plugins: [overview()] })
    expect(deck.mode('overview')).toBe(true)
    query.set(false)
    expect(deck.mode('overview')).toBe(false)
    expect(deck.keymap.lookup('o')).toBe('overview')
    deck.destroy()
  })

  it('can run without a key', () => {
    const deck = makeDeck(specs, {
      plugins: [overview({ key: false, auto: false })],
    })
    expect(deck.keymap.lookup('o')).toBeUndefined()
  })
})
