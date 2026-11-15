import { injectStyle, listen } from '../core/dom'
import { createWriter } from '../core/writer'
import type { Plugin } from '../types'

/**
 * Print support: shows every slide and step, one slide per page at the canvas
 * size, and sets `data-printing` on the root while printing.
 */
export const print = (): Plugin => (deck) => {
  const doc = deck.root.ownerDocument
  const win = doc.defaultView
  if (!win) return
  const writer = createWriter()
  const { width, height } = deck.size
  const removeStyle = injectStyle(
    doc,
    'data-deck-print',
    `@page{size:${width}px ${height}px;margin:0}`,
  )
  const set = (on: boolean) => {
    deck.setMode('print', on)
    writer.attr(deck.root, 'data-printing', on)
  }
  const cleanups = [
    listen(win, 'beforeprint', () => set(true)),
    listen(win, 'afterprint', () => set(false)),
  ]
  return () => {
    cleanups.forEach((cleanup) => cleanup())
    set(false)
    writer.restore()
    removeStyle()
  }
}
