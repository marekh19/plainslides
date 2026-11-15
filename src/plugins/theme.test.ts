import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDeck } from '../test-utils'
import { initialTheme, theme } from './theme'

const specs = [{ title: 'One' }]

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('initialTheme', () => {
  const themes = ['dark', 'light']
  it('prefers HTML, then storage, then the system setting', () => {
    expect(initialTheme(themes, 'light', 'dark', true)).toBe('light')
    expect(initialTheme(themes, undefined, 'light', true)).toBe('light')
    expect(initialTheme(themes, undefined, 'other', true)).toBe('dark')
    expect(initialTheme(themes, undefined, undefined, false)).toBe('light')
    expect(initialTheme(['sepia'], undefined, undefined, false)).toBe('sepia')
    expect(initialTheme([], undefined, undefined, false)).toBe('light')
  })
})

describe('theme plugin', () => {
  it('toggles, stores, and emits the theme', () => {
    const deck = makeDeck(specs, { plugins: [theme()] })
    const html = document.documentElement
    const first = html.getAttribute('data-theme')
    const events: string[] = []
    deck.on('theme', ({ theme: value }) => events.push(value))
    deck.run('theme')
    const second = html.getAttribute('data-theme')
    expect(second).not.toBe(first)
    expect(localStorage.getItem('plainslides-theme')).toBe(second)
    expect(events).toEqual([second])
    deck.destroy()
    expect(html.hasAttribute('data-theme')).toBe(false)
  })

  it('reads the stored theme and a custom list', () => {
    localStorage.setItem('k', 'b')
    const deck = makeDeck(specs, {
      plugins: [theme({ themes: ['a', 'b'], storageKey: 'k', key: false })],
    })
    expect(document.documentElement.getAttribute('data-theme')).toBe('b')
    deck.run('theme')
    expect(document.documentElement.getAttribute('data-theme')).toBe('a')
  })

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const deck = makeDeck(specs, { plugins: [theme()] })
    deck.run('theme')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(true)
  })

  it('does nothing on toggle with an empty list', () => {
    const deck = makeDeck(specs, { plugins: [theme({ themes: [] })] })
    deck.run('theme')
    expect(localStorage.length).toBe(0)
  })
})
