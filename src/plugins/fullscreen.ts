import type { Plugin } from '../types'

export interface FullscreenOptions {
  /** Key for the `fullscreen` command. Default `f`. */
  key?: string | false
}

/** Toggles fullscreen for the whole page. Does nothing without the Fullscreen API. */
export const fullscreen =
  (options: FullscreenOptions = {}): Plugin =>
  (deck) => {
    const { key = 'f' } = options
    const doc = deck.root.ownerDocument
    const toggle = () => {
      const request = doc.fullscreenElement
        ? doc.exitFullscreen?.()
        : doc.documentElement.requestFullscreen?.()
      void request?.catch(() => undefined)
    }
    const cleanups = [
      deck.commands.register('fullscreen', {
        label: 'Fullscreen',
        run: toggle,
      }),
      key === false ? undefined : deck.keymap.bind(key, 'fullscreen'),
    ]
    return () => cleanups.forEach((cleanup) => cleanup?.())
  }
