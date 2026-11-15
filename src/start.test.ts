import { afterEach, describe, expect, it, vi } from 'vitest'
import { start } from './start'
import { mountDeck } from './test-utils'
import type { Deck } from './types'

const decks: Deck[] = []
const run = (options: Parameters<typeof start>[0] = {}) => {
  const deck = start({ warnings: false, ...options })
  decks.push(deck)
  return deck
}

afterEach(() => {
  decks.splice(0).forEach((deck) => deck.destroy())
  vi.restoreAllMocks()
  document.head.innerHTML = ''
  document.documentElement.removeAttribute('data-theme')
})

describe('start', () => {
  it('finds [data-deck] and installs the default plugins and layout', () => {
    mountDeck([{ title: 'One' }, { title: 'Two' }])
    const deck = run()
    expect(document.querySelector('style[data-deck-layout]')).not.toBeNull()
    expect(deck.commands.list().map((command) => command.name)).toEqual([
      'next',
      'prev',
      'first',
      'last',
      'overview',
      'notes',
      'presenter',
      'timer-reset',
      'theme',
      'fullscreen',
      'help',
    ])
    expect(document.documentElement.hasAttribute('data-theme')).toBe(true)
    deck.destroy()
    expect(document.querySelector('style[data-deck-layout]')).toBeNull()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('accepts a root element or selector and turns plugins off', () => {
    const root = mountDeck([{ title: 'One' }])
    root.id = 'talk'
    const options = {
      layout: false,
      fit: false,
      hash: false,
      overview: false,
      notes: false,
      presenter: false,
      timer: false,
      theme: false,
      fullscreen: false,
      keyboard: false,
      pointer: false,
      autohide: false,
      print: false,
      bindings: false,
    } as const
    const deck = run({ root: '#talk', ...options })
    expect(deck.root).toBe(root)
    expect(deck.commands.list()).toHaveLength(4)
    expect(document.querySelector('style[data-deck-layout]')).toBeNull()
    deck.destroy()
    const again = run({ root, ...options, plugins: [() => undefined] })
    expect(again.root).toBe(root)
  })

  it('throws a helpful error without a deck root', () => {
    document.body.innerHTML = ''
    expect(() => start()).toThrow(/no deck root found/)
  })

  it('logs validation issues when warnings are on', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    mountDeck([{ html: '<p>No title</p>' }])
    run({ warnings: true })
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Slide 1 has no title'),
    )
  })
})
