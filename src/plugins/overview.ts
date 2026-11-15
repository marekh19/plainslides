import { isElement, listen } from '../core/dom'
import { createWriter } from '../core/writer'
import type { Plugin } from '../types'

export interface OverviewOptions {
  /** Key for the `overview` command. Default `o`. */
  key?: string | false
  /** Media query that turns overview on automatically. Default `(max-width: 760px)`. */
  auto?: string | false
}

/**
 * Overview mode: all slides as thumbnails. Each slide becomes a focusable
 * button; Enter, Space, or a click opens it and leaves overview.
 */
export const overview =
  (options: OverviewOptions = {}): Plugin =>
  (deck) => {
    const { key = 'o', auto = '(max-width: 760px)' } = options
    const { root } = deck
    const win = root.ownerDocument.defaultView
    const writer = createWriter()

    const current = () => deck.slides[deck.index]?.element
    const focusCurrent = () => {
      const slide = current()
      slide?.scrollIntoView?.({ block: 'nearest' })
      slide?.focus({ preventScroll: true })
    }

    const enter = () => {
      deck.slides.forEach(({ element }) => {
        writer.attr(element, 'tabindex', '0')
        writer.attr(element, 'role', 'button')
        // Screen readers announce a role description instead of "button".
        writer.attr(element, 'aria-roledescription', null)
        // Links and fields inside a thumbnail must not take Tab stops or
        // sit inside a button.
        ;[...element.children].forEach((child) =>
          writer.attr(child, 'inert', true),
        )
      })
      focusCurrent()
    }
    const exit = () => {
      writer.restore()
      root.focus({ preventScroll: true })
    }

    const open = (target: EventTarget | null) => {
      const element = isElement(target) ? target.closest('[data-slide]') : null
      const slide = deck.slides.find((info) => info.element === element)
      if (!slide) return false
      deck.go(slide.index, { transition: false })
      deck.setMode('overview', false)
      return true
    }

    const media =
      auto === false || !win?.matchMedia ? undefined : win.matchMedia(auto)
    const onMedia = () => {
      if (media) deck.setMode('overview', media.matches)
    }

    const cleanups = [
      deck.commands.register('overview', {
        label: 'Overview',
        run: () => deck.toggleMode('overview'),
      }),
      key === false ? undefined : deck.keymap.bind(key, 'overview'),
      deck.on('mode', ({ name, on }) => {
        if (name !== 'overview') return
        if (on) enter()
        else exit()
      }),
      deck.on('change', () => {
        if (deck.mode('overview')) focusCurrent()
      }),
      listen(root, 'click', (event) => {
        if (deck.mode('overview') && open(event.target)) event.preventDefault()
      }),
      listen(root, 'keydown', (event) => {
        if (
          !deck.mode('overview') ||
          !(event instanceof KeyboardEvent) ||
          ![' ', 'Enter'].includes(event.key) ||
          !isElement(event.target) ||
          !event.target.matches('[data-slide]')
        ) {
          return
        }
        if (open(event.target)) event.preventDefault()
      }),
      media ? listen(media, 'change', onMedia) : undefined,
    ]
    if (media?.matches) deck.setMode('overview', true)

    return () => {
      cleanups.forEach((cleanup) => cleanup?.())
      deck.setMode('overview', false)
      writer.restore()
    }
  }
