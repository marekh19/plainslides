export { createDeck } from './core/deck'
export { keyLabel, keyName } from './core/commands'
export { start, type StartOptions } from './start'
export { layoutCss } from './styles/layout'
export { structureCss } from './styles/structure'
export { type AutohideOptions, autohide } from './plugins/autohide'
export { type BindingsOptions, bindings } from './plugins/bindings'
export { type PageFormat } from './plugins/fill'
export { type FitOptions, fit } from './plugins/fit'
export { type FullscreenOptions, fullscreen } from './plugins/fullscreen'
export { type HashOptions, hash } from './plugins/hash'
export {
  DEFAULT_KEYS,
  handleKey,
  type KeyboardOptions,
  keyboard,
} from './plugins/keyboard'
export { type NotesOptions, notes } from './plugins/notes'
export { type OverviewOptions, overview } from './plugins/overview'
export { type PointerOptions, pointer } from './plugins/pointer'
export { type PresenterOptions, presenter } from './plugins/presenter'
export { print } from './plugins/print'
export { type ThemeOptions, theme } from './plugins/theme'
export { type TimerOptions, timer } from './plugins/timer'
export {
  type Widget,
  type WidgetContext,
  type WidgetRegistry,
  widgets,
} from './plugins/widgets'
export type * from './types'
