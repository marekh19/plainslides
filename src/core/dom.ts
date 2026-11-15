/** Adds a `<style>` element to `<head>` and returns a function that removes it. */
export const injectStyle = (doc: Document, marker: string, css: string) => {
  const style = doc.createElement('style')
  style.setAttribute(marker, '')
  style.textContent = css
  doc.head.append(style)
  return () => style.remove()
}

/** Adds an event listener and returns a function that removes it. */
export const listen = <K extends string>(
  target: EventTarget,
  type: K,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions,
) => {
  target.addEventListener(type, handler, options)
  return () => target.removeEventListener(type, handler, options)
}

/** True when the page runs from `file://` or a local host. */
export const isLocal = (location: Location) =>
  location.protocol === 'file:' ||
  ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

const INTERACTIVE =
  'a[href], button, input, textarea, select, label, summary, video, audio, pre, code, [contenteditable]:not([contenteditable="false"]), [data-deck-ignore]'

/**
 * Element check that also works for elements from another window, such as the
 * presenter popup, where `instanceof Element` is false.
 */
export const isElement = (value: unknown): value is Element =>
  typeof value === 'object' &&
  value !== null &&
  'closest' in value &&
  typeof value.closest === 'function'

/** True when a click, swipe, or key on this target belongs to the content. */
export const isInteractive = (
  target: EventTarget | null,
  selector = INTERACTIVE,
) => isElement(target) && target.closest(selector) !== null

/** Scope for binding queries: a document or an element. */
export type Scope = Document | Element

export const queryAll = <E extends Element = HTMLElement>(
  scope: Scope,
  selector: string,
) => [...scope.querySelectorAll<E>(selector)]
