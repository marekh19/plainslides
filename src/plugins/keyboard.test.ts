import { afterEach, describe, expect, it } from 'vitest'
import { makeDeck } from '../test-utils'
import { keyboard } from './keyboard'

const deckWithKeys = (options = {}) =>
  makeDeck([{ title: 'One' }, { title: 'Two' }, { title: 'Three' }], {
    plugins: [keyboard(options)],
  })

const press = (
  key: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document.body,
) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  })
  target.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('keyboard', () => {
  it('navigates with the default keys', () => {
    const deck = deckWithKeys()
    press('ArrowRight')
    press(' ')
    expect(deck.index).toBe(2)
    press(' ', { shiftKey: true })
    expect(deck.index).toBe(1)
    press('End')
    expect(deck.index).toBe(2)
    press('Home')
    expect(deck.index).toBe(0)
    const event = press('PageDown')
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores modifiers, composition, and handled events', () => {
    const deck = deckWithKeys()
    press('ArrowRight', { ctrlKey: true })
    press('ArrowRight', { metaKey: true })
    press('ArrowRight', { altKey: true })
    press('ArrowRight', { isComposing: true })
    const handled = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    handled.preventDefault()
    document.body.dispatchEvent(handled)
    expect(deck.index).toBe(0)
    expect(press('x').defaultPrevented).toBe(false)
  })

  it('ignores form fields and activation keys on links and buttons', () => {
    const deck = deckWithKeys()
    const input = document.createElement('input')
    const button = document.createElement('button')
    const video = document.createElement('video')
    document.body.append(input, button, video)
    press('ArrowRight', {}, input)
    press(' ', {}, video)
    press(' ', {}, button)
    press('Enter', {}, button)
    expect(deck.index).toBe(0)
    press('ArrowRight', {}, button)
    expect(deck.index).toBe(1)
  })

  it('toggles help and accepts custom keys', () => {
    const deck = deckWithKeys({ keys: { next: ['j'] }, help: 'h' })
    press('j')
    expect(deck.index).toBe(1)
    press('ArrowRight')
    expect(deck.index).toBe(1)
    press('h')
    expect(deck.mode('help')).toBe(true)
    press('?')
    expect(deck.mode('help')).toBe(true)
  })

  it('removes its listener and bindings on destroy', () => {
    const deck = deckWithKeys({ help: false })
    deck.destroy()
    press('ArrowRight')
    expect(deck.index).toBe(0)
    expect(deck.keymap.lookup('ArrowRight')).toBeUndefined()
  })
})
