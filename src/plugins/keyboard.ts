import { keyName } from '../core/commands'
import { isInteractive, listen } from '../core/dom'
import type { Deck, Plugin } from '../types'

/** Default keys per command. */
export const DEFAULT_KEYS: Readonly<Record<string, readonly string[]>> = {
  next: ['ArrowRight', 'ArrowDown', 'PageDown', 'Space', 'Enter'],
  prev: ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'Shift+Space'],
  first: ['Home'],
  last: ['End'],
}

export interface KeyboardOptions {
  /** Keys per command. Replaces the defaults for the commands you list. */
  keys?: Readonly<Record<string, readonly string[]>>
  /** Key for the `help` command, which toggles the `help` mode. Default `?`. */
  help?: string | false
}

const EDITABLE =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
const ACTIVATES = 'a[href], button, summary, video, audio, [role="button"]'
const ACTIVATION_KEYS = ['Space', 'Shift+Space', 'Enter']

/**
 * Runs the command bound to a key event. Ignores events with Ctrl, Meta, or
 * Alt, events during text composition, events from form fields, and Space or
 * Enter on links and buttons. The presenter window uses the same handler.
 */
export const handleKey = (deck: Deck, event: KeyboardEvent) => {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.isComposing
  ) {
    return
  }
  const key = keyName(event)
  if (isInteractive(event.target, EDITABLE)) return
  if (ACTIVATION_KEYS.includes(key) && isInteractive(event.target, ACTIVATES)) {
    return
  }
  const command = deck.keymap.lookup(key)
  if (command === undefined || deck.commands.get(command) === undefined) return
  event.preventDefault()
  deck.run(command)
}

/** Keyboard navigation and the `help` command. */
export const keyboard =
  (options: KeyboardOptions = {}): Plugin =>
  (deck) => {
    const keys = { ...DEFAULT_KEYS, ...options.keys }
    const help = options.help ?? '?'
    const doc = deck.root.ownerDocument
    const cleanups = [
      deck.commands.register('help', {
        label: 'Keyboard help',
        run: () => deck.toggleMode('help'),
      }),
      ...Object.entries(keys).flatMap(([command, list]) =>
        list.map((key) => deck.keymap.bind(key, command)),
      ),
      help === false ? undefined : deck.keymap.bind(help, 'help'),
      listen(doc, 'keydown', (event) => {
        if (event instanceof KeyboardEvent) handleKey(deck, event)
      }),
    ]
    return () => cleanups.forEach((cleanup) => cleanup?.())
  }
