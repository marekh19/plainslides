import { listen, queryAll } from '../core/dom'
import { createWriter } from '../core/writer'
import type { Plugin } from '../types'

export interface AutohideOptions {
  /** Milliseconds without pointer movement before `data-idle` is set. Default 4000. */
  delay?: number
}

/** Sets `data-idle` on `[data-deck-autohide]` elements while the pointer rests. */
export const autohide =
  (options: AutohideOptions = {}): Plugin =>
  (deck) => {
    const { delay = 4000 } = options
    const doc = deck.root.ownerDocument
    const writer = createWriter()
    let timeout: ReturnType<typeof setTimeout> | undefined

    const mark = (idle: boolean) =>
      queryAll(doc, '[data-deck-autohide]').forEach((element) =>
        writer.attr(element, 'data-idle', idle),
      )
    const wake = () => {
      mark(false)
      clearTimeout(timeout)
      timeout = setTimeout(() => mark(true), delay)
    }

    const cleanups = [
      listen(doc, 'pointermove', wake, { passive: true }),
      listen(doc, 'pointerdown', wake, { passive: true }),
    ]
    wake()
    return () => {
      clearTimeout(timeout)
      cleanups.forEach((cleanup) => cleanup())
      writer.restore()
    }
  }
