import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeDeck } from '../test-utils'
import { autohide } from './autohide'
import { fit, fitStage, fitThumbnails } from './fit'
import { fullscreen } from './fullscreen'
import { print } from './print'
import { type Widget, widgets } from './widgets'

const specs = [{ title: 'One' }, { title: 'Two' }]

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  document.head.innerHTML = ''
})

describe('fit', () => {
  it('computes scale and offsets', () => {
    expect(
      fitStage({ width: 1600, height: 900 }, { width: 800, height: 900 }),
    ).toEqual({ scale: 0.5, x: 0, y: 225 })
    expect(
      fitStage({ width: 1600, height: 900 }, { width: 0, height: 0 }).scale,
    ).toBe(0)
  })

  it('computes overview columns', () => {
    expect(fitThumbnails(1600, 1000, 320, 16)).toEqual({
      columns: 2,
      scale: (1000 - 48) / 2 / 1600,
    })
    expect(fitThumbnails(1600, 200, 320, 16).columns).toBe(1)
  })

  it('writes the stage variables and subtracts a visible notes panel', () => {
    const deck = makeDeck(specs, { plugins: [fit({ thumbWidth: 400 })] })
    const scale = () => Number(deck.root.style.getPropertyValue('--deck-scale'))
    expect(deck.root.style.getPropertyValue('--deck-thumb-columns')).not.toBe(
      '',
    )
    const before = scale()
    expect(before).toBeGreaterThan(0)
    const panel = document.createElement('div')
    panel.setAttribute('data-deck-notes-panel', '')
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, window.innerHeight / 2),
    )
    document.body.append(panel)
    deck.setMode('notes', true)
    expect(scale()).toBeLessThan(before)
    deck.destroy()
    expect(deck.root.style.getPropertyValue('--deck-scale')).toBe('')
  })
})

describe('fullscreen', () => {
  it('requests and exits fullscreen', () => {
    const request = vi.fn(() => Promise.reject(new Error('denied')))
    document.documentElement.requestFullscreen = request
    const deck = makeDeck(specs, { plugins: [fullscreen()] })
    deck.run('fullscreen')
    expect(request).toHaveBeenCalled()
    const exit = vi.fn(() => Promise.resolve())
    document.exitFullscreen = exit
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => document.body,
    })
    deck.run('fullscreen')
    expect(exit).toHaveBeenCalled()
    expect(deck.keymap.lookup('f')).toBe('fullscreen')
    Reflect.deleteProperty(document, 'fullscreenElement')
  })
})

describe('autohide', () => {
  it('sets data-idle after the delay and clears it on movement', () => {
    vi.useFakeTimers()
    document.body.insertAdjacentHTML('beforeend', '')
    const deck = makeDeck(specs, {
      plugins: [
        (target) => {
          document.body.insertAdjacentHTML(
            'beforeend',
            '<div id="bar" data-deck-autohide></div>',
          )
          return autohide({ delay: 1000 })(target)
        },
      ],
    })
    const bar = document.getElementById('bar')
    vi.advanceTimersByTime(1000)
    expect(bar?.hasAttribute('data-idle')).toBe(true)
    document.dispatchEvent(new PointerEvent('pointermove'))
    expect(bar?.hasAttribute('data-idle')).toBe(false)
    deck.destroy()
    vi.advanceTimersByTime(2000)
    expect(bar?.hasAttribute('data-idle')).toBe(false)
  })
})

describe('print', () => {
  it('shows all slides while printing and sets the page size', () => {
    const deck = makeDeck(specs, { plugins: [print()] })
    expect(
      document.querySelector('style[data-deck-print]')?.textContent,
    ).toContain('size:1600px 900px')
    window.dispatchEvent(new Event('beforeprint'))
    expect(deck.mode('print')).toBe(true)
    expect(deck.root.hasAttribute('data-printing')).toBe(true)
    window.dispatchEvent(new Event('afterprint'))
    expect(deck.mode('print')).toBe(false)
    deck.destroy()
    expect(document.querySelector('style[data-deck-print]')).toBeNull()
  })
})

describe('widgets', () => {
  const setup = () => {
    const unmount = vi.fn()
    const mount = vi.fn<Widget['mount']>((element) => {
      element.textContent = 'chart'
      return unmount
    })
    const deck = makeDeck(
      [
        {
          title: 'One',
          html: '<figure data-widget="chart" aria-label="Chart"></figure><div data-widget="missing"></div>',
        },
      ],
      { plugins: [widgets({ chart: { mount } })] },
    )
    return { deck, mount, unmount }
  }

  it('mounts registered widgets and reports missing ones', () => {
    const { deck, mount, unmount } = setup()
    expect(mount).toHaveBeenCalledTimes(1)
    expect(deck.root.querySelector('figure')?.textContent).toBe('chart')
    expect(deck.validate().map((issue) => issue.code)).toEqual(['widget'])
    deck.destroy()
    expect(unmount).toHaveBeenCalled()
  })

  it('gives widgets the theme, events, and preview flag', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    const seen: unknown[] = []
    const deck = makeDeck(
      [{ title: 'One', html: '<div data-widget="w"></div>' }],
      {
        plugins: [
          widgets({
            w: {
              mount(_element, context) {
                seen.push(context.theme, context.preview, context.deck)
                context.on('theme', ({ theme }) => seen.push(theme))
              },
            },
          }),
        ],
      },
    )
    expect(seen).toEqual(['dark', false, deck])
    deck.emit('theme', { theme: 'light' })
    expect(seen.at(-1)).toBe('light')
    deck.destroy()
    deck.emit('theme', { theme: 'x' })
    document.documentElement.removeAttribute('data-theme')
  })

  it('mounts again into presenter previews and drops old ones', () => {
    const { deck, mount, unmount } = setup()
    const preview = document.createElement('div')
    preview.innerHTML = '<div data-widget="chart">old output</div>'
    document.body.append(preview)
    deck.emit('preview', { element: preview })
    expect(mount).toHaveBeenCalledTimes(2)
    expect(mount.mock.calls[1]?.[1]).toMatchObject({ preview: true })
    preview.remove()
    deck.emit('preview', { element: document.createElement('div') })
    expect(unmount).toHaveBeenCalledTimes(1)
  })
})
