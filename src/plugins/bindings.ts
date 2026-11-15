import { createWriter } from '../core/writer'
import type { Plugin } from '../types'
import {
  fillPage,
  fillProgress,
  fillSection,
  fillTrackers,
  type PageFormat,
  renderKeys,
} from './fill'

export interface BindingsOptions {
  /** Formats `[data-deck-page]`. Receives the 1-based number and the count. Default `3 / 22`. */
  pageFormat?: PageFormat
}

/**
 * Fills `[data-deck-page]`, `[data-deck-progress]`, `[data-deck-section]`,
 * `[data-deck-tracker]`, `[data-deck-agenda]`, and `[data-deck-keys]`.
 */
export const bindings =
  (options: BindingsOptions = {}): Plugin =>
  (deck) => {
    const doc = deck.root.ownerDocument
    const writer = createWriter()
    const update = () => {
      fillPage(doc, deck, writer, options.pageFormat)
      fillProgress(doc, deck, writer)
      fillSection(doc, deck, writer)
      fillTrackers(doc, deck, writer)
    }
    const cleanups = [
      deck.on('change', update),
      deck.on('mode', ({ name, on }) => {
        if (name === 'help' && on) renderKeys(doc, deck, writer)
      }),
    ]
    update()
    renderKeys(doc, deck, writer)
    return () => {
      cleanups.forEach((cleanup) => cleanup())
      writer.restore()
    }
  }
