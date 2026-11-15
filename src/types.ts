/** Built-in modes. Plugins may add their own names. */
export type ModeName =
  | 'overview'
  | 'notes'
  | 'presenter'
  | 'print'
  | 'help'
  | (string & {})

export type Direction = 'forward' | 'backward'

export interface SlideInfo {
  readonly element: HTMLElement
  /** 0-based position in the deck. */
  readonly index: number
  readonly id: string | undefined
  readonly title: string
  /** Target time in seconds from `data-duration`. */
  readonly duration: number | undefined
  readonly section: string | undefined
  readonly subsection: string | undefined
  /** The slide's own `data-transition`, without the root fallback. */
  readonly transition: string | undefined
  readonly notes: HTMLElement | undefined
  /** Step groups in reveal order. */
  readonly stepGroups: readonly (readonly HTMLElement[])[]
}

export interface SectionInfo {
  readonly name: string
  /** 0-based index of the first slide in the section. */
  readonly start: number
  /** 0-based index of the last slide in the section. */
  readonly end: number
  readonly subsections: readonly {
    readonly name: string
    readonly start: number
    readonly end: number
  }[]
}

export type Pace = 'on' | 'behind' | 'ahead'

export interface TimerState {
  readonly running: boolean
  /** `Date.now()` when the timer started, or undefined before the start. */
  readonly startedAt: number | undefined
  /** Elapsed seconds. */
  readonly elapsed: number
  /** Sum of all `data-duration` values in seconds. */
  readonly plannedTotal: number
  /** Planned seconds up to the middle of the current slide. */
  readonly plannedUntilNow: number
  /** Undefined when no slide has a duration. */
  readonly pace: Pace | undefined
  /** `elapsed - plannedUntilNow` in seconds. Positive means behind. */
  readonly delta: number
}

export interface DeckEvents {
  /** Any change of position: a new slide or a new step on the same slide. */
  change: {
    index: number
    step: number
    previousIndex: number
    previousStep: number
    direction: Direction
  }
  /** Only a step change on the same slide. Fires after `change`. */
  step: { index: number; step: number; direction: Direction }
  /** After a slide transition finishes, or right after `change` without one. */
  settled: { index: number }
  mode: { name: ModeName; on: boolean }
  tick: TimerState
  theme: { theme: string }
  /** The presenter window rendered a preview. Widgets mount into it. */
  preview: { element: HTMLElement }
}

export type DeckEventName = keyof DeckEvents

export interface DeckIssue {
  readonly code: string
  readonly message: string
  readonly element?: Element
}

export interface Command {
  /** Help text shown next to the keys. */
  readonly label: string
  readonly run: () => void
}

export interface CommandRegistry {
  /** Adds or replaces a command. Returns a function that removes it. */
  register(name: string, command: Command): () => void
  get(name: string): Command | undefined
  /** Commands in registration order. */
  list(): readonly { name: string; label: string }[]
}

export interface KeymapEntry {
  readonly command: string
  readonly label: string
  readonly keys: readonly string[]
}

export interface Keymap {
  /**
   * Binds a key to a command. Key names follow `KeyboardEvent.key`, with
   * `Space` for the space bar, lower-case letters, and a `Shift+` prefix for
   * named keys such as `Shift+Space`. Returns a function that removes it.
   */
  bind(key: string, command: string): () => void
  /** The command bound to a key. The latest binding wins. */
  lookup(key: string): string | undefined
  /** Bindings grouped by command, in command registration order. */
  list(): readonly KeymapEntry[]
  /** Keys bound to more than one command. */
  conflicts(): readonly { key: string; commands: readonly string[] }[]
}

export interface GoOptions {
  /** Number of revealed step groups, or `'all'`. Default 0. */
  step?: number | 'all'
  /** Set to false to skip the slide transition. Default true. */
  transition?: boolean
}

export interface Deck {
  readonly root: HTMLElement
  readonly slides: readonly SlideInfo[]
  /** 0-based in the API; 1-based in attributes, page numbers, and the URL. */
  readonly index: number
  /** Number of revealed step groups on the current slide. */
  readonly step: number
  readonly sections: readonly SectionInfo[]
  readonly transitioning: boolean
  /** Canvas size in CSS pixels. */
  readonly size: { readonly width: number; readonly height: number }

  /** Opens a slide by 0-based index or by `id`. Out-of-range values clamp. */
  go(target: number | string, options?: GoOptions): void
  /** Reveals the next step group, or moves to the next slide. */
  next(): void
  /** Hides the current step group, or moves to the previous slide. */
  prev(): void
  first(): void
  last(): void

  mode(name: ModeName): boolean
  setMode(name: ModeName, on: boolean): void
  toggleMode(name: ModeName): void

  /** Runs a registered command. Unknown names do nothing. */
  run(command: string): void
  readonly commands: CommandRegistry
  readonly keymap: Keymap

  /** Subscribes to an event. Returns a function that unsubscribes. */
  on<E extends DeckEventName>(
    event: E,
    handler: (payload: DeckEvents[E]) => void,
  ): () => void
  /** Sends an event to all subscribers. For plugins. */
  emit<E extends DeckEventName>(event: E, payload: DeckEvents[E]): void

  /** Runs all checks and returns the issues found. */
  validate(): DeckIssue[]
  /** Adds a check to `validate()`. Returns a function that removes it. */
  addCheck(check: () => readonly DeckIssue[]): () => void
  /** Logs a warning when the deck runs from `file://` or `localhost`. */
  warn(message: string): void

  /** Installs a plugin. Returns a function that removes it. */
  use(plugin: Plugin): () => void
  /** Removes every listener, element, and attribute the library added. */
  destroy(): void
}

/** A feature. Receives the deck and returns an optional cleanup function. */
export type Plugin = (deck: Deck) => (() => void) | void

export interface DeckOptions {
  /** Canvas width in CSS pixels. Overrides `data-width`. Default 1600. */
  width?: number
  /** Canvas height in CSS pixels. Overrides `data-height`. Default 900. */
  height?: number
  /** Maximum wait for a slide transition in milliseconds. Default 1000. */
  transitionTimeout?: number
  /** Injects the structural CSS into `<head>`. Default true. */
  injectStyles?: boolean
  /** Logs warnings with `console.warn`. Default: only on `file://` and `localhost`. */
  warnings?: boolean
  /** Plugins to install after the core. */
  plugins?: readonly Plugin[]
}
