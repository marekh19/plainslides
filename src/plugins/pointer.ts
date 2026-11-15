import { isInteractive, listen } from '../core/dom'
import type { Plugin } from '../types'

export interface PointerOptions {
  /** Share of the width, from the left edge, that goes back. Default 1/3. */
  backZone?: number
  /** Click zones. Default true. */
  click?: boolean
  /** Horizontal swipe on touch screens. Default true. */
  swipe?: boolean
  /** Minimum horizontal swipe distance in CSS pixels. Default 50. */
  swipeThreshold?: number
}

/** -1 for back, 1 for forward, 0 for no swipe. */
export const swipeDirection = (dx: number, dy: number, threshold: number) => {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}

/** Click zones and touch swipes. No wheel navigation. */
export const pointer =
  (options: PointerOptions = {}): Plugin =>
  (deck) => {
    const {
      backZone = 1 / 3,
      click = true,
      swipe = true,
      swipeThreshold = 50,
    } = options
    const { root } = deck
    const win = root.ownerDocument.defaultView
    let start: { x: number; y: number } | undefined
    let swipedAt = 0

    const ignored = (event: Event) =>
      deck.mode('overview') ||
      event.defaultPrevented ||
      isInteractive(event.target)

    const onClick = (event: Event) => {
      if (!(event instanceof MouseEvent) || event.button !== 0) return
      if (ignored(event) || Date.now() - swipedAt < 500) return
      if ((win?.getSelection()?.toString() ?? '') !== '') return
      const rect = root.getBoundingClientRect()
      if (rect.width === 0) return
      const share = (event.clientX - rect.left) / rect.width
      if (share < backZone) deck.prev()
      else deck.next()
    }

    const onDown = (event: Event) => {
      if (!(event instanceof PointerEvent)) return
      start =
        event.pointerType === 'touch' && event.isPrimary && !ignored(event)
          ? { x: event.clientX, y: event.clientY }
          : undefined
    }

    const onUp = (event: Event) => {
      if (!(event instanceof PointerEvent) || start === undefined) return
      const direction = swipeDirection(
        event.clientX - start.x,
        event.clientY - start.y,
        swipeThreshold,
      )
      start = undefined
      if (direction === 0) return
      swipedAt = Date.now()
      if (direction > 0) deck.next()
      else deck.prev()
    }

    const cleanups = [
      click ? listen(root, 'click', onClick) : undefined,
      ...(swipe
        ? [
            listen(root, 'pointerdown', onDown),
            listen(root, 'pointerup', onUp),
            listen(root, 'pointercancel', () => {
              start = undefined
            }),
          ]
        : []),
    ]
    return () => cleanups.forEach((cleanup) => cleanup?.())
  }
