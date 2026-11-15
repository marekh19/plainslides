import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDeck } from '../test-utils'
import { pointer, swipeDirection } from './pointer'

const slides = [
  { title: 'One', html: '<a href="#x" id="link">Link</a>' },
  { title: 'Two' },
  { title: 'Three' },
]

const setup = (options = {}) => {
  const deck = makeDeck(slides, { plugins: [pointer(options)] })
  vi.spyOn(deck.root, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 900, 500),
  )
  return deck
}

const click = (target: Element, clientX: number) =>
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, clientX }),
  )

const touch = (target: Element, type: string, clientX: number, clientY = 0) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      clientX,
      clientY,
    }),
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe('swipeDirection', () => {
  it('needs a mostly horizontal move over the threshold', () => {
    expect(swipeDirection(-80, 10, 50)).toBe(1)
    expect(swipeDirection(80, 10, 50)).toBe(-1)
    expect(swipeDirection(30, 0, 50)).toBe(0)
    expect(swipeDirection(60, 90, 50)).toBe(0)
  })
})

describe('pointer', () => {
  it('uses click zones', () => {
    const deck = setup()
    click(deck.root, 800)
    expect(deck.index).toBe(1)
    click(deck.root, 100)
    expect(deck.index).toBe(0)
  })

  it('ignores interactive targets, overview, and other buttons', () => {
    const deck = setup()
    const link = document.getElementById('link')
    if (link) click(link, 800)
    deck.root.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: 800, button: 2 }),
    )
    deck.setMode('overview', true)
    click(deck.root, 800)
    expect(deck.index).toBe(0)
  })

  it('ignores clicks while text is selected or the root has no size', () => {
    const deck = setup()
    const selection = vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'text',
    } as Selection)
    click(deck.root, 800)
    expect(deck.index).toBe(0)
    selection.mockReturnValue(null)
    vi.spyOn(deck.root, 'getBoundingClientRect').mockReturnValue(new DOMRect())
    click(deck.root, 800)
    expect(deck.index).toBe(0)
  })

  it('navigates with horizontal swipes and suppresses the click after', () => {
    const deck = setup()
    touch(deck.root, 'pointerdown', 500)
    touch(deck.root, 'pointerup', 400)
    expect(deck.index).toBe(1)
    click(deck.root, 800)
    expect(deck.index).toBe(1)
    touch(deck.root, 'pointerdown', 400)
    touch(deck.root, 'pointerup', 500)
    expect(deck.index).toBe(0)
    touch(deck.root, 'pointerdown', 400)
    touch(deck.root, 'pointerup', 410)
    touch(deck.root, 'pointerdown', 400)
    deck.root.dispatchEvent(new PointerEvent('pointercancel'))
    touch(deck.root, 'pointerup', 200)
    expect(deck.index).toBe(0)
  })

  it('can turn off clicks and swipes', () => {
    const deck = setup({ click: false, swipe: false })
    click(deck.root, 800)
    touch(deck.root, 'pointerdown', 500)
    touch(deck.root, 'pointerup', 300)
    expect(deck.index).toBe(0)
    deck.destroy()
  })
})
