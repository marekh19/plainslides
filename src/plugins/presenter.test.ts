import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDeck } from '../test-utils'
import { keyboard } from './keyboard'
import { notes } from './notes'
import { presenter } from './presenter'
import { timer } from './timer'
import { widgets } from './widgets'

const specs = [
  {
    title: 'One',
    html: '<p data-step>a</p><p data-step>b</p><aside data-notes><p>First notes</p></aside>',
  },
  { title: 'Two', html: '<div data-widget="w"></div>' },
]

/** A second happy-dom window that stands in for the popup. */
const popupWindow = () => {
  const popup = new Window()
  let closed = false
  Object.defineProperty(popup, 'closed', { get: () => closed })
  popup.close = () => {
    closed = true
  }
  return popup
}

const stubOpen = (...popups: (Window | null)[]) =>
  vi.spyOn(window, 'open').mockImplementation(
    // happy-dom's Window type differs from the DOM lib Window type.
    () => (popups.shift() ?? null) as unknown as globalThis.Window,
  )

const setup = (options = {}) => {
  const mount = vi.fn()
  const deck = makeDeck(specs, {
    plugins: [
      presenter(options),
      timer({ start: 'load' }),
      notes(),
      keyboard(),
      widgets({ w: { mount } }),
    ],
  })
  return { deck, mount }
}

afterEach(() => {
  vi.restoreAllMocks()
  document.head.innerHTML = ''
})

describe('presenter', () => {
  it('renders the current slide, the next step, notes, and the clock', () => {
    const popup = popupWindow()
    stubOpen(popup)
    const style = document.createElement('style')
    style.textContent = '.author { color: red }'
    document.head.append(style)
    document.documentElement.setAttribute('data-theme', 'dark')
    document.title = 'Talk'
    const { deck } = setup()
    deck.run('presenter')
    const pdoc = popup.document
    expect(deck.mode('presenter')).toBe(true)
    expect(pdoc.title).toBe('Presenter: Talk')
    expect(pdoc.head.textContent).toContain('.author')
    expect(pdoc.documentElement.getAttribute('data-theme')).toBe('dark')
    const current = pdoc.querySelector('[data-deck-presenter-current]')
    const next = pdoc.querySelector('[data-deck-presenter-next]')
    expect(current?.querySelector('[data-deck-preview] h2')?.textContent).toBe(
      'One',
    )
    expect(
      [...(next?.querySelectorAll('[data-step]') ?? [])].map((step) =>
        step.getAttribute('data-step-state'),
      ),
    ).toEqual(['current', 'hidden'])
    expect(pdoc.querySelector('[data-deck-notes-text]')?.textContent).toBe(
      'First notes',
    )
    expect(pdoc.querySelector('[data-deck-page]')?.textContent).toBe('1 / 2')
    expect(pdoc.querySelector('[data-deck-clock]')?.textContent).toBe('00:00')
    document.documentElement.removeAttribute('data-theme')
  })

  it('updates on change and theme, and shows all steps of the next slide', () => {
    const popup = popupWindow()
    stubOpen(popup)
    const { deck, mount } = setup()
    deck.run('presenter')
    deck.go(0, { step: 'all' })
    const next = popup.document.querySelector('[data-deck-presenter-next]')
    expect(next?.querySelector('h2')?.textContent).toBe('Two')
    expect(mount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ preview: true }),
    )
    deck.last()
    expect(next?.hasAttribute('data-empty')).toBe(true)
    document.documentElement.setAttribute('data-theme', 'light')
    deck.emit('theme', { theme: 'light' })
    expect(popup.document.documentElement.getAttribute('data-theme')).toBe(
      'light',
    )
    document.documentElement.removeAttribute('data-theme')
    deck.emit('theme', { theme: '' })
    expect(popup.document.documentElement.hasAttribute('data-theme')).toBe(
      false,
    )
  })

  it('shares the keyboard handler with the popup', () => {
    const popup = popupWindow()
    stubOpen(popup)
    const { deck } = setup()
    deck.run('presenter')
    popup.document.body.dispatchEvent(
      new popup.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    expect(deck.step).toBe(1)
  })

  it('uses a template from the page', () => {
    const popup = popupWindow()
    stubOpen(popup)
    const { deck } = setup()
    document.body.insertAdjacentHTML(
      'beforeend',
      '<template data-deck-presenter><p id="custom" data-deck-page></p></template>',
    )
    deck.run('presenter')
    expect(popup.document.getElementById('custom')?.textContent).toBe('1 / 2')
  })

  it('falls back to notes mode when the popup is blocked', () => {
    stubOpen(null, null)
    const { deck } = setup()
    deck.run('presenter')
    expect(deck.mode('presenter')).toBe(false)
    expect(deck.mode('notes')).toBe(true)
  })

  it('retries once when the old popup cannot be used', () => {
    const broken = popupWindow()
    const realDocument = broken.document
    let reads = 0
    Object.defineProperty(broken, 'document', {
      get: () => {
        reads += 1
        if (reads === 1) throw new Error('SecurityError')
        return realDocument
      },
    })
    const fresh = popupWindow()
    stubOpen(broken, fresh)
    const { deck } = setup()
    deck.run('presenter')
    expect(broken.closed).toBe(true)
    expect(
      fresh.document.querySelector('[data-deck-presenter-layout]'),
    ).not.toBe(null)
  })

  it('closes the popup with the mode, and the mode with the popup', () => {
    const popup = popupWindow()
    const second = popupWindow()
    stubOpen(popup, second)
    const { deck } = setup({ key: false })
    deck.setMode('presenter', true)
    deck.setMode('presenter', false)
    expect(popup.closed).toBe(true)
    deck.setMode('presenter', true)
    second.dispatchEvent(new second.Event('pagehide'))
    expect(deck.mode('presenter')).toBe(false)
    deck.next()
  })

  it('closes the popup when the page goes away', () => {
    const popup = popupWindow()
    stubOpen(popup)
    const { deck } = setup()
    deck.run('presenter')
    window.dispatchEvent(new Event('pagehide'))
    expect(popup.closed).toBe(true)
    deck.destroy()
  })
})
