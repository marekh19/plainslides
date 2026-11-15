import { createDeck } from './core/deck'
import { injectStyle, isLocal } from './core/dom'
import { type AutohideOptions, autohide } from './plugins/autohide'
import { type BindingsOptions, bindings } from './plugins/bindings'
import { type FitOptions, fit } from './plugins/fit'
import { type FullscreenOptions, fullscreen } from './plugins/fullscreen'
import { type HashOptions, hash } from './plugins/hash'
import { type KeyboardOptions, keyboard } from './plugins/keyboard'
import { type NotesOptions, notes } from './plugins/notes'
import { type OverviewOptions, overview } from './plugins/overview'
import { type PointerOptions, pointer } from './plugins/pointer'
import { type PresenterOptions, presenter } from './plugins/presenter'
import { print } from './plugins/print'
import { type ThemeOptions, theme } from './plugins/theme'
import { type TimerOptions, timer } from './plugins/timer'
import { type WidgetRegistry, widgets } from './plugins/widgets'
import { layoutCss } from './styles/layout'
import type { Deck, DeckOptions, Plugin } from './types'

/** Options for `start()`. Each plugin takes its options object, or `false` to turn it off. */
export interface StartOptions extends DeckOptions {
  /** The deck root, or a selector for it. Default `[data-deck]`. */
  root?: HTMLElement | string
  /** Injects the layout helper CSS. Default true. */
  layout?: boolean
  fit?: FitOptions | false
  hash?: HashOptions | false
  overview?: OverviewOptions | false
  notes?: NotesOptions | false
  presenter?: PresenterOptions | false
  timer?: TimerOptions | false
  theme?: ThemeOptions | false
  fullscreen?: FullscreenOptions | false
  keyboard?: KeyboardOptions | false
  pointer?: PointerOptions | false
  autohide?: AutohideOptions | false
  print?: false
  bindings?: BindingsOptions | false
  /** Widgets by name, for `[data-widget="name"]`. */
  widgets?: WidgetRegistry
}

const optional = <O>(
  value: O | false | undefined,
  create: (options: O | undefined) => Plugin,
): Plugin[] => (value === false ? [] : [create(value)])

const findRoot = (root: StartOptions['root']) => {
  const element =
    typeof root === 'string' || root === undefined
      ? document.querySelector(root ?? '[data-deck]')
      : root
  if (!(element instanceof HTMLElement)) {
    throw new Error(
      'plainslides: no deck root found. Add data-deck to the element that contains the slides, and call start() after it.',
    )
  }
  return element
}

/**
 * Starts the deck with all default plugins and the layout helpers. Call it
 * after the deck markup, for example in a script at the end of `<body>`.
 * On `file://` and `localhost` it logs validation issues with `console.warn`.
 */
export const start = (options: StartOptions = {}): Deck => {
  const root = findRoot(options.root)
  const doc = root.ownerDocument
  const removeLayout =
    options.layout === false
      ? undefined
      : injectStyle(doc, 'data-deck-layout', layoutCss)

  // Order matters: hash opens the start slide before the timer listens, and
  // bindings render the key list after every plugin has bound its keys.
  const plugins: Plugin[] = [
    ...optional(options.fit, fit),
    ...optional(options.hash, hash),
    ...optional(options.overview, overview),
    ...optional(options.notes, notes),
    ...optional(options.presenter, presenter),
    ...optional(options.timer, timer),
    ...optional(options.theme, theme),
    ...optional(options.fullscreen, fullscreen),
    ...optional(options.keyboard, keyboard),
    ...optional(options.pointer, pointer),
    ...optional(options.autohide, autohide),
    ...optional(options.print, print),
    widgets(options.widgets),
    ...optional(options.bindings, bindings),
    ...(options.plugins ?? []),
    () => removeLayout,
  ]

  const deck = createDeck(root, { ...options, plugins })
  const local = doc.defaultView ? isLocal(doc.defaultView.location) : false
  if (options.warnings ?? local) {
    deck.validate().forEach((issue) => deck.warn(issue.message))
  }
  return deck
}
