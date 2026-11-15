import { queryAll } from '../core/dom'
import { createWriter } from '../core/writer'
import type { Plugin } from '../types'
import { fillNotes } from './fill'

export interface NotesOptions {
  /** Key for the `notes` command. Default `n`. */
  key?: string | false
}

/**
 * Notes mode for the in-page panel. Shows `[data-deck-notes-panel]` while the
 * mode is on and fills `[data-deck-notes-text]` and `[data-deck-next-title]`.
 */
export const notes =
  (options: NotesOptions = {}): Plugin =>
  (deck) => {
    const { key = 'n' } = options
    const doc = deck.root.ownerDocument
    const writer = createWriter()

    const showPanels = () =>
      queryAll(doc, '[data-deck-notes-panel]').forEach((panel) =>
        writer.attr(panel, 'hidden', !deck.mode('notes')),
      )

    const cleanups = [
      deck.commands.register('notes', {
        label: 'Speaker notes',
        run: () => deck.toggleMode('notes'),
      }),
      key === false ? undefined : deck.keymap.bind(key, 'notes'),
      deck.on('mode', ({ name }) => {
        if (name === 'notes') showPanels()
      }),
      deck.on('change', () => fillNotes(doc, deck, writer)),
    ]
    showPanels()
    fillNotes(doc, deck, writer)

    return () => {
      cleanups.forEach((cleanup) => cleanup?.())
      deck.setMode('notes', false)
      writer.restore()
    }
  }
